import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * [Vercel Blob 서버 핸들러]
 * 파일 위치: pages/api/upload.ts
 * 호출 주소: /api/upload
 */
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  // 1. POST 요청만 허용
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = request.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // 업로드 전 권한 및 파일 형식 체크
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'application/pdf', 
            'text/plain',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // 엑셀 지원
          ],
          tokenPayload: JSON.stringify({
            // 필요 시 여기에 사용자 ID 등을 추가하여 보안 강화 가능
          }),
        };
      },
      // 업로드 완료 시 서버 로그 기록
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Vercel Blob 업로드 완료:', blob.url);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Blob Handler Error:", error);
    return response.status(400).json({ error: (error as Error).message });
  }
}