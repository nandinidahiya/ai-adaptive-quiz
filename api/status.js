/**
 * /api/status.js — Health check endpoint
 * Returns which provider is active (never exposes the key).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).set(CORS).end();
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  const provider = (process.env.PROVIDER || "anthropic").toLowerCase();
  const KEY_MAP = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    groq: "GROQ_API_KEY",
  };

  const keySet = !!process.env[KEY_MAP[provider]];

  return res.status(200).json({
    status: keySet ? "ready" : "missing_key",
    provider,
    key_configured: keySet,
    endpoints: {
      chat: "/api/chat",
      status: "/api/status",
    },
  });
}
