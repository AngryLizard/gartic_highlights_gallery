export interface Env {
  DB: D1Database;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return origin === 'https://gartic-highlights-gallery.pages.dev' || origin.endsWith('netliz.net');
}

let cachedManifest: {dates: Array<{date: string, subfolders: string[]}>} | null = null;

async function getManifest(env: Env): Promise<{dates: Array<{date: string, subfolders: string[]}>}> {
  if (cachedManifest) return cachedManifest;
  try {
    const response = await fetch(new URL('/manifest.json', 'https://gartic-highlights-gallery.pages.dev/'));
    cachedManifest = await response.json();
    return cachedManifest;
  } catch (error) {
    console.error('Failed to fetch manifest:', error);
    return {dates: []};
  }
}

async function getStats(env: Env): Promise<Record<string, {favorite: number, bad: number}>> {
  if (!env.DB) {
    console.error('D1 database not bound. Check wrangler.toml configuration.');
    return {};
  }
  try {
    const result = await env.DB.prepare('SELECT * FROM votes').all();
    const stats: Record<string, {favorite: number, bad: number}> = {};
    for (const row of result.results as Array<{image_id: string, fav_count: number, bad_count: number}>) {
      stats[row.image_id] = {favorite: row.fav_count, bad: row.bad_count};
    }
    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {};
  }
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
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/list') {
      const manifest = await getManifest(env);
      const stats = await getStats(env);
      
      // Merge stats into manifest items using item identifiers
      const datesWithStats = manifest.dates.map((dateObj: any) => ({
        ...dateObj,
        items: dateObj.items.map((item: any) => {
            let subkeys = [];
            if (item.name !== '') {
                subkeys = ['compilation', 'comic'];
                subkeys.push(...Array.from({ length: item.count }, (_, i) => `frame${(i + 1)}`));
            } else {
              subkeys = Array.from({ length: item.count }, (_, i) => `${(i + 1)}`);
            }
            const imageData = subkeys.map(key => {
                const voteData = stats[`${dateObj.date}/${item.name}/${key}`] || {favorite: 0, bad: 0};
                return {key: key, fav: voteData.favorite || 0, bad: voteData.bad || 0};
            });
            return {
                name: item.name,
                images: imageData
            };
            })
        }));
      
      return new Response(JSON.stringify({
        dates: datesWithStats
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
        },
      });
    }

    if (request.method === 'POST' && url.pathname === '/mark') {
      if (!env.DB) {
        return new Response(JSON.stringify({error: 'Database not configured'}), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
          },
        });
      }

      const body = await request.json() as {path: string, action: 'favorite' | 'bad', add: boolean};
      const image_id = body.path;
      const action = body.action;
      const add = body.add !== false; // Default to true if not specified

      try {
        // Check if entry exists
        const existing = await env.DB.prepare('SELECT * FROM votes WHERE image_id = ?').bind(image_id).first();
        
        if (add) {
          // Adding a vote
          if (!existing) {
            // Create entry if it doesn't exist
            if (action === 'favorite') {
              await env.DB.prepare('INSERT INTO votes(image_id, fav_count, bad_count) VALUES(?, 1, 0)').bind(image_id).run();
            } else {
              await env.DB.prepare('INSERT INTO votes(image_id, fav_count, bad_count) VALUES(?, 0, 1)').bind(image_id).run();
            }
          } else {
            // Increment the appropriate count
            if (action === 'favorite') {
              await env.DB.prepare('UPDATE votes SET fav_count = fav_count + 1 WHERE image_id = ?').bind(image_id).run();
            } else {
              await env.DB.prepare('UPDATE votes SET bad_count = bad_count + 1 WHERE image_id = ?').bind(image_id).run();
            }
          }
        } else {
          // Removing a vote
          if (existing) {
            // Decrement the appropriate count (never go below 0)
            if (action === 'favorite') {
              await env.DB.prepare('UPDATE votes SET fav_count = MAX(0, fav_count - 1) WHERE image_id = ?').bind(image_id).run();
            } else {
              await env.DB.prepare('UPDATE votes SET bad_count = MAX(0, bad_count - 1) WHERE image_id = ?').bind(image_id).run();
            }
          }
        }

        return new Response(JSON.stringify({success: true}), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
          },
        });
      } catch (error) {
        console.error('Error marking image:', error);
        return new Response(JSON.stringify({error: 'Failed to mark image'}), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
          },
        });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};