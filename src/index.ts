export interface Env {
  // Add environment variables here if needed
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://gartic-highlights-gallery.pages.dev',
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
          'Access-Control-Allow-Origin': 'https://gartic-highlights-gallery.pages.dev',
        },
      });
    }
    return new Response('Method not allowed', { status: 405 });
  },
};