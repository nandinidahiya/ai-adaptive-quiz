/**
 * /api/chat.js — Vercel Serverless Function
 * Secure AI proxy: key never exposed to client.
 * Provider-independent: swap PROVIDER env var to switch AI backends.
 */

const PROVIDERS = {
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    buildHeaders: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    }),
    buildBody: ({ messages, model, system, max_tokens }) => ({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: max_tokens || 1024,
      system: system || "You are a helpful assistant.",
      messages,
    }),
    extractReply: (data) => data?.content?.[0]?.text || "",
    extractUsage: (data) => data?.usage || {},
  },

  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    buildHeaders: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    buildBody: ({ messages, model, system, max_tokens }) => ({
      model: model || "gpt-4o",
      max_tokens: max_tokens || 1024,
      messages: [
        { role: "system", content: system || "You are a helpful assistant." },
        ...messages,
      ],
    }),
    extractReply: (data) => data?.choices?.[0]?.message?.content || "",
    extractUsage: (data) => data?.usage || {},
  },

  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    buildHeaders: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    buildBody: ({ messages, model, system, max_tokens }) => ({
      model: model || "llama-3.3-70b-versatile",
      max_tokens: max_tokens || 1024,
      messages: [
        { role: "system", content: system || "You are a helpful assistant." },
        ...messages,
      ],
    }),
    extractReply: (data) => data?.choices?.[0]?.message?.content || "",
    extractUsage: (data) => data?.usage || {},
  },
};

// CORS headers — allow any browser origin
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req, res) {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).set(CORS).end();
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Resolve provider from env (default: anthropic)
  const providerName = (process.env.PROVIDER || "anthropic").toLowerCase();
  const provider = PROVIDERS[providerName];

  if (!provider) {
    return res.status(500).json({
      error: `Unknown provider "${providerName}". Valid: ${Object.keys(PROVIDERS).join(", ")}`,
    });
  }

  // Pick the right API key env var
  const KEY_MAP = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    groq: "GROQ_API_KEY",
  };
  const apiKey = process.env[KEY_MAP[providerName]];

  if (!apiKey) {
    return res.status(500).json({
      error: `Missing env var: ${KEY_MAP[providerName]}. Add it in Vercel dashboard → Settings → Environment Variables.`,
    });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { messages, model, system, max_tokens } = body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "`messages` array is required" });
  }

  try {
    const upstream = await fetch(provider.url, {
      method: "POST",
      headers: provider.buildHeaders(apiKey),
      body: JSON.stringify(provider.buildBody({ messages, model, system, max_tokens })),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || data?.error || "Upstream API error",
        raw: data,
      });
    }

    return res.status(200).json({
      reply: provider.extractReply(data),
      usage: provider.extractUsage(data),
      provider: providerName,
      model: data?.model || model,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
