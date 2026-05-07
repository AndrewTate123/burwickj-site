export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://burwickj.com',
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400, headers });
  }

  const { prefix, gmail } = body ?? {};

  /* ── Validate ── */
  if (!prefix || typeof prefix !== 'string') {
    return new Response(JSON.stringify({ error: 'Prefix is required.' }), { status: 400, headers });
  }
  if (!/^[a-z0-9._-]{1,40}$/.test(prefix)) {
    return new Response(JSON.stringify({ error: 'Prefix must be 1–40 characters: letters, numbers, dots, dashes, underscores only.' }), { status: 400, headers });
  }
  if (!gmail || typeof gmail !== 'string' || !gmail.endsWith('@gmail.com')) {
    return new Response(JSON.stringify({ error: 'A valid Gmail address is required.' }), { status: 400, headers });
  }

  const email = `${prefix}@burwickj.com`;

  /* ── Call Cloudflare Email Routing API ── */
  let cfRes;
  try {
    cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/email/routing/rules`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: prefix,
          enabled: true,
          matchers: [{ field: 'to', type: 'literal', value: email }],
          actions: [{ type: 'forward', value: [gmail] }],
        }),
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach email routing service.' }), { status: 502, headers });
  }

  const cfData = await cfRes.json();

  if (!cfData.success) {
    const msg = cfData.errors?.[0]?.message ?? 'Could not create forwarding rule.';
    /* Cloudflare returns a specific message when the address already exists */
    const friendly = msg.toLowerCase().includes('already exist')
      ? `${email} is already taken — try a different prefix.`
      : msg;
    return new Response(JSON.stringify({ error: friendly }), { status: 409, headers });
  }

  return new Response(JSON.stringify({ success: true, email }), { status: 200, headers });
}

/* Pre-flight for CORS */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://burwickj.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
