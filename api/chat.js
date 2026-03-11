module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const prompt = body && body.prompt;
  if (!prompt) return res.status(400).json({ error: '`prompt` field is required' });

  const models = ['llama-3.3-70b-versatile', 'llama3-70b-8192'];

  for (const model of models) {
    try {
      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 520,
          temperature: 0.7,
        }),
      });

      if (upstream.status === 429) {
        return res.status(429).json({ error: 'Rate limited', retryAfter: 5 });
      }
      if (upstream.status === 503 || upstream.status === 404) {
        continue; // try next model
      }
      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({}));
        return res.status(upstream.status).json({ error: err?.error?.message || 'Upstream error' });
      }

      const data = await upstream.json();
      const content = data?.choices?.[0]?.message?.content || '';
      return res.status(200).json({ content, model });

    } catch (err) {
      continue;
    }
  }

  return res.status(502).json({ error: 'All models failed' });
};
