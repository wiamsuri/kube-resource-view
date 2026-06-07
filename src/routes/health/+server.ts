import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store'
    }
  });
};
