import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
    const body = request.body;
    const { method } = request;

    // 1. CORS 설정 (모바일/클라이언트 접근 허용)
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 2. Preflight (OPTIONS) 요청 처리
    if (method === 'OPTIONS') {
        return response.status(200).end();
    }

    // 3. POST 요청 처리
    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                return {
                    allowedContentTypes: [
                        'image/jpeg',
                        'image/png',
                        'image/gif',
                        'application/pdf',
                        'text/plain',
                        'video/mp4',
                        'video/webm',
                        'video/quicktime'
                    ],
                    tokenPayload: JSON.stringify({
                        // uploadedBy: user.id, // 예시
                    }),
                    addRandomSuffix: true, // 파일명 중복 방지를 위해 랜덤 접미사 추가
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('blob upload completed', blob, tokenPayload);
            },
        });

        return response.status(200).json(jsonResponse);
    } catch (error) {
        console.error('Blob Upload Error:', error);
        return response.status(400).json(
            { error: error.message }
        );
    }
}
