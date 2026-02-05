import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * [Vercel Blob 서버 측 핸들러]
 * 파일 위치: pages/api/upload.ts
 * 호출 주소: /api/upload
 * * 원칙: 무누락, Pages Router 규격 준수, 실시간 로깅 포함
 */
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  // 1. POST 방식이 아니면 405 에러 반환 (보안 및 오호출 방지)
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = request.body as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      // 업로드 전 토큰 생성 및 권한 검증
      onBeforeGenerateToken: async (pathname) => {
        /**
         * 클라이언트에서 전달받은 pathname을 기반으로 업로드 허용 설정
         * .env.local의 BLOB_READ_WRITE_TOKEN을 자동으로 참조함
         */
        return {
          allowedContentTypes: [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'application/pdf', 
            'text/plain'
          ],
          tokenPayload: JSON.stringify({
            // 필요 시 추가적인 사용자 권한 로직 삽입 가능
          }),
        };
      },
      // 업로드 완료 후 실행될 콜백
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Vercel Blob 업로드 성공:', blob.url);
      },
    });

    // 2. 성공 시 Vercel Blob 응답 데이터 반환
    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Blob Handler Error:', error);
    // 3. 에러 발생 시 상세 메시지 반환
    return response.status(400).json({ 
      error: (error as Error).message 
    });
  }
}