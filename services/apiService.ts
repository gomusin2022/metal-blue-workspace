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
 * [문자 전송 서비스]
 * 대상 번호 목록과 메시지 내용을 받아 API 서버로 전송합니다.
 * 소스 누락 없이 기존 로직을 그대로 보존합니다.
 */
export const sendSmsMessage = async (numbers: string[], content: string) => {
  // 실제 연동 시 fetch를 통한 SMS 게이트웨이 호출 로직이 들어갈 자리입니다.
  console.log("SMS 전송 실행 - 대상 수:", numbers.length, "내용 요약:", content.substring(0, 20));
  
  // [기존 로직 보존] 서버 엔드포인트 호출
  const response = await fetch('/api/db/members', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumbers: numbers, message: content }),
  });

  return response.ok;
};