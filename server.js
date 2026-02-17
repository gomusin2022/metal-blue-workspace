import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 1. 미들웨어 설정
app.use(cors());
app.use(express.json());

// 2. 업로드 폴더 생성 및 정적 파일 경로 설정
const UPLOAD_DIR = 'uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

// 3. Multer 저장소 설정 (파일명 충돌 방지)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // 한글 파일명 깨짐 방지를 위해 Buffer 사용
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(file.originalname);
        const fileName = `${uuidv4()}${ext}`;
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 최대 20MB 제한
});

// 4. 파일 업로드 API 엔드포인트
app.post('/api/upload', upload.array('files'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '파일이 없습니다.' });
        }

        // 현재 실행 중인 서버의 호스트 정보를 기반으로 URL 생성
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const urls = req.files.map(file => {
            return `${baseUrl}/uploads/${file.filename}`;
        });

        res.json({ urls });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: '서버 내부 오류 발생' });
    }
});

app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Storage] Files will be saved in: ${path.join(__dirname, UPLOAD_DIR)}`);
});