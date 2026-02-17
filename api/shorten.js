import { db } from '@vercel/postgres';

export default async function handler(req, res) {
    // 1. CORS Setup
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const { originalUrl } = req.body;
            if (!originalUrl) return res.status(400).json({ error: 'Original URL is required' });

            const client = await db.connect();

            // 2. Ensure Table Exists
            await client.sql`
                CREATE TABLE IF NOT EXISTS short_urls (
                    id VARCHAR(10) PRIMARY KEY,
                    original_url TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;

            // 3. Generate Short ID (Simple random string)
            // 5 chars = enough for small scale (36^5 combinations)
            const id = Math.random().toString(36).substring(2, 7);

            // 4. Save to DB
            await client.sql`
                INSERT INTO short_urls (id, original_url)
                VALUES (${id}, ${originalUrl})
            `;

            // 5. Construct Short URL
            // Check if running on localhost or production
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers['host'];
            const shortUrl = `${protocol}://${host}/s/${id}`;

            return res.status(200).json({ shortUrl });

        } catch (error) {
            console.error('Shorten Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
