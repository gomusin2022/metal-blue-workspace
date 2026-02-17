import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
const PORT = 3001;

// 1. [CORS 완전 허용]: 모바일 및 외부 접근 허용
// credentials: true는 origin: '*'과 함께 사용할 수 없으므로 제외하거나 origin을 특정해야 함.
// 여기서는 접속 에러 해결이 우선이므로 모든 Origin 허용('*')에 집중합니다.
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
app.use(express.json());

// [디버깅] 요청 로그 출력
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// [Health Check] 서버 상태 확인용
app.get('/api/upload', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Upload server is running' });
});

// 2. [Preflight 대응]: OPTIONS 요청에 대해 즉시 200 응답
// 브라우저가 본 요청(POST)을 보내기 전에 예비 요청을 보낼 때 신속히 응답하여 타임아웃 방지
app.options('*', (req, res) => {
    res.status(200).end();
});

// 3. Multer 설정 (메모리 스토리지)
// Vercel 읽기 전용 파일 시스템 대응
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    // [설정 제외]: 파일 용량 제한 설정은 기본값(또는 Vercel 플랫폼 한계)에 맡기고 코드에서 제외함
});

// 4. 파일 업로드 API 엔드포인트
app.post('/api/upload', upload.array('files'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            // 파일이 없어도 로직상 성공으로 간주해야 한다면 변경 가능하나, 기본적으로는 400
            return res.status(400).json({ error: '파일이 전송되지 않았습니다.' });
        }

        const fileNames = req.files.map(file => {
            // 한글 파일명 깨짐 방지
            return Buffer.from(file.originalname, 'latin1').toString('utf8');
        });

        console.log('Upload successful (Memory):', fileNames);

        // 클라이언트 호환용 가상 URL 생성
        const urls = req.files.map(file => `memory://${file.originalname}`);

        // 5. [서버리스 응답 보장]: 처리 즉시 명시적인 200 OK 응답 반환
        // 지연 없이 응답을 종결하여 Vercel Function Timeout 방지
        return res.status(200).json({
            urls,
            message: "파일이 정상적으로 수신되었습니다.",
            uploadedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Upload Error:', error);
        // 에러 발생 시에도 확실한 JSON 응답 반환
        return res.status(500).json({ error: '서버 내부 처리 중 오류가 발생했습니다.' });
    }
});

// 로컬 테스트 환경 설정
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`[Server] Running on http://localhost:${PORT}`);
    });
}

// Vercel Serverless Function Export
export default app;