// src/services/apiService.ts

import { upload } from '@vercel/blob/client';

/**
 * [Vercel Blob 업로드 서비스]
 * 단체 문자 발송 시 첨부할 이미지를 Vercel Blob 스토리지에 업로드합니다.
 * @param file 업로드할 파일 객체
 * @returns 업로드 완료된 파일의 공용 URL 링크
 */
export const uploadToVercelBlob = async (file: File): Promise<string> => {
  try {
    // client-side upload 방식 사용
    // handleUploadUrl은 /api/upload/blob.ts 경로를 가리킴
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload/blob', // 서버측 핸들러 엔드포인트
    });

    // 업로드 성공 시 생성된 URL 반환
    return blob.url;
  } catch (error) {
    console.error("Vercel Blob Upload Error:", error);
    throw new Error('파일 업로드 중 오류가 발생했습니다.');
  }
};

/**
 * [기존 기능 유지] 이미지를 구글 드라이브에 업로드하고 공유 링크를 반환합니다.
 * (Vercel Blob 도입 후에도 호환성을 위해 유지)
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
 */
export const sendSmsMessage = async (numbers: string[], content: string) => {
  // 실제 연동 시 fetch를 통한 SMS 게이트웨이 호출 로직이 들어갈 자리입니다.
  console.log("SMS 전송 실행 - 대상 수:", numbers.length, "내용 요약:", content.substring(0, 20));
  return true;
};