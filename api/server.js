import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
const PORT = 3001;

// 1. 미들웨어 설정
app.use(cors());
app.use(express.json());

// 2. Multer 저장소 설정 (Vercel 환경 지원을 위해 메모리 스토리지 사용)
// 디스크 저장은 Vercel의 Serverless Function에서 지속되지 않으므로 메모리에 임시 저장합니다.
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 4.5 * 1024 * 1024 } // Vercel Serverless Function Payload 제한(4.5MB) 고려
});

// 3. 파일 업로드 API 엔드포인트
app.post('/api/upload', upload.array('files'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '파일이 없습니다.' });
        }

        // 메모리에 저장된 파일 정보를 기반으로 응답 생성
        // 실제 운영 환경에서는 AWS S3, Vercel Blob 등으로 파일을 전송해야 하지만,
        // 현재 요구사항(일회용 문자 발송)에 맞춰 파일 처리 로직을 여기서 수행하거나
        // 클라이언트에게 성공 메시지만 반환할 수 있습니다.

        // 여기서는 파일이 성공적으로 수신되었음을 알리는 가상의 URL 또는 성공 신호를 반환합니다.
        // 주의: 메모리에 있는 파일은 응답이 끝나면 사라집니다. 
        // 문자 발송 로직이 이 요청 내에서 바로 이루어지거나, 
        // 파일을 다른 영구 저장소로 옮겨야 URL을 제공할 수 있습니다.
        // 현재는 파일명만 반환하여 클라이언트가 업로드 성공을 인지하게 합니다.

        const fileNames = req.files.map(file => {
            // 한글 파일명 깨짐 방지 처리
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            return originalName;
        });

        console.log('Upload successful (Memory):', fileNames);

        // 클라이언트 호환성을 위해 urls 배열 형태 유지 (실제 접근 가능한 URL은 아님)
        // 문자 발송 서비스에서 이 'URL'을 파일 식별자로 사용할 수 있도록 조정이 필요할 수 있습니다.
        const urls = req.files.map(file => `memory://${file.originalname}`);

        res.json({ urls, message: "파일이 서버 메모리에 수신되었습니다." });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: '서버 내부 오류 발생' });
    }
});

// 로컬 테스트를 위한 리스너 (Vercel에서는 export default app이 사용됨)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`[Server] Running on http://localhost:${PORT}`);
    });
}

// Vercel Serverless Function으로 동작하기 위한 내보내기
export default app;