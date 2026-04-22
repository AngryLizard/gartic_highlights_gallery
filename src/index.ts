export interface Env {
  // Add environment variables here if needed
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return origin === 'https://gartic-highlights-gallery.pages.dev' || origin.endsWith('.netliz.net');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('origin');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method === 'GET') {
      const randomNumber = Math.floor(Math.random() * 100) + 1;
      return new Response(JSON.stringify({ number: randomNumber }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
        },
      });
    }
    return new Response('Method not allowed', { status: 405 });
  },
};