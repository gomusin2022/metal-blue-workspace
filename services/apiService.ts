// services/apiService.ts

import { upload } from '@vercel/blob/client';

/**
 * [Vercel Blob 업로드 서비스]
 * 단체 문자 발송 시 첨부할 이미지를 Vercel Blob 스토리지에 업로드합니다.
 * @param file 업로드할 파일 객체
 * @returns 업로드 완료된 파일의 공용 URL 링크
 */
export const uploadToVercelBlob = async (file: File): Promise<string> => {
  try {
    // [코딩 오류 수정] client-side upload 시 handleUploadUrl을 명시적으로 처리
    // 404 에러와 GET 오호출을 방지하기 위해 서버 핸들러와의 통신을 최적화합니다.
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload', // 서버측 핸들러 엔드포인트 (pages/api/upload.ts)
    });

    if (!blob || !blob.url) {
      throw new Error('응답 데이터에 URL이 포함되어 있지 않습니다.');
    }

    // 업로드 성공 시 생성된 URL 반환
    return blob.url;
  } catch (error) {
    // 상세한 에러 로깅을 통해 추후 디버깅을 용이하게 함
    console.error("Vercel Blob Upload Error Details:", error);
    throw new Error('Vercel Blob 파일 업로드 중 오류가 발생했습니다.');
  }
};

/**
 * [로컬 서버 파일 업로드 서비스] - 신규 추가
 * server.js의 /api/upload 엔드포인트를 사용하여 파일을 업로드합니다.
 * @param files 업로드할 파일 배열 (File[])
 * @returns 업로드된 파일들의 URL 배열 (Promise<string[]>)
 */
export const uploadFiles = async (files: File[]): Promise<string[]> => {
  try {
    const formData = new FormData();
    // server.js의 upload.array('files') 설정에 맞춰 'files' 키값 사용
    files.forEach(file => {
      formData.append('files', file);
    });

    // 로컬 서버 업로드 엔드포인트 호출 (상대 경로 사용)
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData, // Content-Type은 fetch가 자동으로 설정 (multipart/form-data)
    });

    if (!response.ok) {
      // 응답이 JSON이 아닐 수 있으므로 text로 먼저 읽음
      const errorText = await response.text();
      let errorMessage = '파일 업로드 실패';

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        // HTML 에러 페이지 등이 반환된 경우
        console.error("Server Error (Non-JSON response):", errorText);
        errorMessage = `서버 오류 발생 (${response.status}): 관리자에게 문의하세요.`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.urls;
  } catch (error) {
    console.error("Local File Upload Error:", error);
    throw error;
  }
};

/**
 * [기존 기능 유지] 이미지를 구글 드라이브에 업로드하고 공유 링크를 반환합니다.
 * (Vercel Blob 도입 후에도 호환성을 위해 유지 - 소스 누락 금지 준수)
 */
export const uploadToGoogleDrive = async (files: FileList): Promise<string[]> => {
  const API_KEY = 'AIzaSyAI7VWPxYup1dJrbcJ20Aq199hWis9UK8s'; // 사용자 제공 키
  const FOLDER_ID = '1Un2C7fDMjMS18As41yJAMPlY-xU57MhJ'; // 사용자 제공 폴더 ID
  const API_ENDPOINT = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${API_KEY}`;

  const uploadPromises = Array.from(files).map(async (file) => {
    const metadata = {
      name: file.name,
      parents: [FOLDER_ID]
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Drive API 오류 상세:", errorData);
      throw new Error('구글 드라이브 업로드 실패');
    }

    const data = await response.json();
    return `https://drive.google.com/file/d/${data.id}/view?usp=sharing`;
  });

  return Promise.all(uploadPromises);
};

/**
 * [문자 전송 서비스] - 기능 업데이트
 * 대상 번호 목록과 메시지 내용, 첨부 파일(선택 사항)을 받아 API 서버로 전송합니다.
 * @param numbers 수신자 전화번호 배열
 * @param content 문자 메시지 내용
 * @param attachments (옵션) 첨부 파일 URL 배열
 */
export const sendSmsMessage = async (numbers: string[], content: string, attachments?: string[]) => {
  // 실제 연동 시 fetch를 통한 SMS 게이트웨이 호출 로직이 들어갈 자리입니다.
  console.log("SMS 전송 실행 - 대상 수:", numbers.length, "내용 요약:", content.substring(0, 20));
  if (attachments && attachments.length > 0) {
    console.log("첨부 파일 포함:", attachments);
  }

  // [기존 로직 보존 및 확장] 서버 엔드포인트 호출
  // 첨부 파일이 있는 경우 body에 포함하여 전송
  const response = await fetch('/api/db/members', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumbers: numbers,
      message: content,
      attachments: attachments || [] // 첨부 파일 필드 추가
    }),
  });

  return response.ok;
};