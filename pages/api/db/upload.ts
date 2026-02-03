import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename') || 'file.txt';

    // Vercel Blob에 파일 업로드 (보안이 강화된 고유 링크 생성)
    const blob = await put(filename, req.body as ReadableStream, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
