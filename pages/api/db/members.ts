import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await db.connect();
  const { branch } = req.query;

  if (req.method === 'GET') {
    try {
      // 테이블 생성 및 데이터 조회 (지점별 필터링)
      await client.sql`CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, branch TEXT, data JSONB);`;
      let rows;
      if (branch === '전체') {
        rows = await client.sql`SELECT data FROM members;`;
      } else {
        rows = await client.sql`SELECT data FROM members WHERE branch = ${branch as string};`;
      }
      return res.status(200).json(rows.rows.map(r => r.data));
    } catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }

  if (req.method === 'POST') {
    try {
      const { branch: saveBranch, members } = req.body;
      
      // 저장 시 해당 지점 데이터만 삭제 후 다시 삽입 (데이터 무결성)
      if (saveBranch === '전체') {
        await client.sql`DELETE FROM members;`;
      } else {
        await client.sql`DELETE FROM members WHERE branch = ${saveBranch as string};`;
      }

      for (const m of members) {
        await client.sql`INSERT INTO members (id, branch, data) VALUES (${m.id}, ${m.branch}, ${JSON.stringify(m)});`;
      }
      return res.status(200).json({ success: true });
    } catch (e) { return res.status(500).json({ error: (e as Error).message }); }
  }
}
