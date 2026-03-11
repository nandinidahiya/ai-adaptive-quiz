# ⚡ NeuralProxy — Serverless AI Proxy

A complete, browser-ready AI chat interface backed by a Vercel serverless function.  
**Your API key never leaves the server. Works with Anthropic, OpenAI, or Groq.**

---

## 🗂 File Structure

```
├── api/
│   ├── chat.js        ← Serverless proxy (POST /api/chat)
│   └── status.js      ← Health check    (GET  /api/status)
├── public/
│   └── index.html     ← Standalone chat UI (works in any browser)
├── vercel.json        ← Routing & function config
├── package.json
└── .env.example       ← Copy → .env.local for local dev
```

---

## 🚀 Deploy in 3 Steps

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "init"
gh repo create neural-proxy --public --push
# or: git remote add origin <your-repo-url> && git push -u origin main
```

### 2. Import on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Click **Deploy** (no build settings needed)

### 3. Add your API key
In Vercel Dashboard → your project → **Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `PROVIDER` | `anthropic` (or `openai` / `groq`) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `OPENAI_API_KEY` | `sk-...` *(optional)* |
| `GROQ_API_KEY` | `gsk_...` *(optional)* |

Then **Redeploy** (Deployments tab → ⋯ → Redeploy).

Your URL (`https://your-app.vercel.app`) is now live and works in any browser!

---

## 🔌 API Reference

### `POST /api/chat`
```json
{
  "messages": [{ "role": "user", "content": "Hello!" }],
  "system": "You are a helpful assistant.",
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024
}
```
**Response:**
```json
{
  "reply": "Hi! How can I help you?",
  "usage": { "input_tokens": 10, "output_tokens": 8 },
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514"
}
```

### `GET /api/status`
Returns provider name and whether the key is configured.

---

## 💻 Local Dev

```bash
npm install
cp .env.example .env.local   # fill in your key
npx vercel dev               # runs at http://localhost:3000
```

---

## 🌐 Use From External Sites (CORS-free)

The proxy returns `Access-Control-Allow-Origin: *`.  
You can call it from **any** frontend on **any** domain:

```javascript
const res = await fetch("https://your-app.vercel.app/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }]
  })
});
const { reply } = await res.json();
```

---

## 🔁 Switching Providers

Just change `PROVIDER` env var and redeploy:
- `anthropic` → uses `ANTHROPIC_API_KEY`, defaults to `claude-sonnet-4-20250514`
- `openai` → uses `OPENAI_API_KEY`, defaults to `gpt-4o`
- `groq` → uses `GROQ_API_KEY`, defaults to `llama-3.3-70b-versatile`

The frontend UI and API contract stay identical — zero code changes.
