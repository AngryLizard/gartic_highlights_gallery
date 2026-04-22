export interface Env {
  // Add environment variables here if needed
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET') {
      const randomNumber = Math.floor(Math.random() * 100) + 1;
      return new Response(JSON.stringify({ number: randomNumber }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Method not allowed', { status: 405 });
  },
};