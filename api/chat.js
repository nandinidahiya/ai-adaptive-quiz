/**
 * /api/chat.js — Vercel Serverless Proxy for Groq
 * Your GROQ_API_KEY lives here as an env var — never exposed to browser.
 * Called by the quiz frontend on every question generation.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Model priority: best accuracy first, fallback second
const MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192'];

export default async function handler(req, res) {
  // Preflight
  if (req.method === 'OPTIONS') {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GROQ_API_KEY not set. Add it in Vercel → Settings → Environment Variables.'
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { prompt, model: requestedModel } = body || {};
  if (!prompt) return res.status(400).json({ error: '`prompt` is required' });

  // Try requested model first, then fallback chain
  const modelsToTry = requestedModel
    ? [requestedModel, ...MODELS.filter(m => m !== requestedModel)]
    : MODELS;

  let lastError = 'Unknown error';

  for (const model of modelsToTry) {
    try {
      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 520,
          temperature: 0.7,
        }),
      });

      // Model unavailable — try next
      if (upstream.status === 503 || upstream.status === 404) {
        lastError = `Model ${model} unavailable`;
        continue;
      }

      // Rate limit — return to client so it can retry
      if (upstream.status === 429) {
        const data = await upstream.json().catch(() => ({}));
        return res.status(429).json({
          error: 'Rate limited',
          retryAfter: upstream.headers.get('retry-after') || 5,
        });
      }

      if (!upstream.ok) {
        const data = await upstream.json().catch(() => ({}));
        lastError = data?.error?.message || `HTTP ${upstream.status}`;
        continue;
      }

      const data = await upstream.json();
      const content = data?.choices?.[0]?.message?.content || '';

      return res.status(200).json({
        content,
        model,
        usage: data?.usage || {},
      });

    } catch (err) {
      lastError = err.message || String(err);
    }
  }

  return res.status(502).json({ error: lastError });
}
