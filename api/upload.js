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
                // [보안] 인증 로직이 필요하다면 여기에 추가 (예: DB 유저 확인)
                // 현재는 모든 요청에 대해 업로드를 허용합니다.
                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
                    tokenPayload: JSON.stringify({
                        // uploadedBy: user.id, // 예시
                    }),
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
