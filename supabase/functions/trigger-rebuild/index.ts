const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const token = Deno.env.get('GITHUB_TOKEN');
  const owner = Deno.env.get('GITHUB_OWNER');
  const repo = Deno.env.get('GITHUB_REPO');
  if (!token || !owner || !repo) {
    return new Response(JSON.stringify({ error: 'server not configured' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'clash-legend-bases-admin' },
    body: JSON.stringify({ event_type: 'content-update' })
  });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: await res.text() }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
  });
});
