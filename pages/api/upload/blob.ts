import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const body = request.body as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body, request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif'],
        tokenPayload: JSON.stringify({}),
      }),
      onUploadCompleted: async ({ blob }) => { console.log('Upload ok:', blob.url); },
    });
    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({ error: (error as Error).message });
  }
}
