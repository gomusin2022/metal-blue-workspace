import { db } from '@vercel/postgres';

export default async function handler(req, res) {
    const { id } = req.query; // Got from rewrites in vercel.json

    if (!id) {
        return res.status(400).send('Invalid Link');
    }

    try {
        const client = await db.connect();

        // 1. Lookup Original URL
        const { rows } = await client.sql`
            SELECT original_url FROM short_urls WHERE id = ${id}
        `;

        if (rows.length > 0) {
            // 2. Redirect
            res.redirect(307, rows[0].original_url);
        } else {
            res.status(404).send('Link not found');
        }
    } catch (error) {
        console.error('Redirect Error:', error);
        res.status(500).send('Server Error');
    }
}
