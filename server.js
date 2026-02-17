
import express from 'express';
import cors from 'cors';
import { handleUpload } from '@vercel/blob/client';
import { db } from '@vercel/postgres';

// .env.local 로드 (Node.js 20.6.0+ 내장 기능 사용 가능, 또는 dotenv 필요)
// 여기서는 간단히 process.env를 사용한다고 가정하고, 실행 시 --env-file을 권장하거나 dotenv를 사용.
// package.json에 dotenv가 없으므로 동적으로 import하거나 실행 스크립트에서 처리.

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 1. File Upload Handler (Vercel Blob)
app.post('/api/upload', async (req, res) => {
    try {
        const jsonResponse = await handleUpload({
            body: req.body,
            request: req,
            onBeforeGenerateToken: async (pathname) => {
                return {
                    allowedContentTypes: [
                        'image/jpeg', 'image/png', 'image/gif',
                        'application/pdf', 'text/plain',
                        'video/mp4', 'video/webm', 'video/quicktime'
                    ],
                    tokenPayload: JSON.stringify({}),
                    addRandomSuffix: true, // 파일명 중복 방지를 위해 랜덤 접미사 추가
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Server: Blob upload completed', blob.url);
            },
        });
        res.json(jsonResponse);
    } catch (error) {
        console.error('Server: Upload error:', error);
        res.status(400).json({ error: error.message });
    }
});

// 2. Member Management Handler
app.get('/api/db/members', async (req, res) => {
    try {
        const client = await db.connect();
        const { branch } = req.query;

        // 테이블 존재 여부 확인 및 생성
        await client.sql`CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, branch TEXT, data JSONB);`;

        let rows;
        if (branch === '전체' || !branch) {
            rows = await client.sql`SELECT data FROM members;`;
        } else {
            rows = await client.sql`SELECT data FROM members WHERE branch = ${branch};`;
        }
        res.json(rows.rows.map(r => r.data));
    } catch (error) {
        console.error('Server: DB Fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/db/members', async (req, res) => {
    try {
        const client = await db.connect();
        const { branch: saveBranch, members } = req.body;

        if (saveBranch === '전체') {
            await client.sql`DELETE FROM members;`;
        } else {
            await client.sql`DELETE FROM members WHERE branch = ${saveBranch};`;
        }

        // 배치 삽입 또는 루프 삽입
        for (const m of members) {
            await client.sql`INSERT INTO members (id, branch, data) VALUES (${m.id}, ${m.branch}, ${JSON.stringify(m)});`;
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Server: DB Save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. SMS Sending Handler (New Endpoint)
// 기존 클라이언트가 PATCH /api/db/members 로 잘못 요청하던 것을 대체
app.post('/api/send-sms', (req, res) => {
    const { phoneNumbers, message, attachments } = req.body;

    console.log('--- SMS Send Request ---');
    console.log('Destinations:', phoneNumbers.length, 'numbers');
    console.log('Content:', message);
    console.log('Attachments:', attachments);

    // 실제 SMS 발송 로직은 여기에 구현 (현재는 로그만 출력)

    // 성공 응답
    res.json({ success: true, count: phoneNumbers.length });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
