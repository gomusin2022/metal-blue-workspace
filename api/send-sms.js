export default async function handler(req, res) {
    // 1. CORS 설정 (모바일/클라이언트 접근 허용)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 2. Preflight (OPTIONS) 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. POST 요청 처리
    if (req.method === 'POST') {
        const { phoneNumbers, message, attachments } = req.body;

        console.log('--- SMS Send Request (Serverless) ---');
        console.log('Destinations:', phoneNumbers?.length, 'numbers');
        console.log('Content:', message);
        console.log('Attachments:', attachments);

        // 실제 SMS 발송 로직은 여기에 구현 (현재는 로그만 출력하고 성공 응답)
        // 예: coolsms, twilio 등 연동

        return res.status(200).json({
            success: true,
            count: phoneNumbers?.length || 0,
            message: "Mock SMS sent successfully"
        });
    }

    // 4. 지원하지 않는 메서드
    return res.status(405).json({ error: 'Method Not Allowed' });
}
