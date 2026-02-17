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
                // [권한 설정] 모든 파일 형식 허용
                // 클라이언트가 요청한 contentType을 그대로 허용 목록에 추가합니다.
                // request.body.payload 내에 클라이언트가 보낸 정보가 들어있습니다.
                const requestedContentType = body?.payload?.contentType;

                return {
                    allowedContentTypes: requestedContentType ? [requestedContentType] : [],
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
