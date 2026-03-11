 DISPATCHER IQ — EASA Adaptive Assessment Platform

<div align="center">

![EASA Flight Dispatcher](https://img.shields.io/badge/EASA-Flight%20Dispatcher-00c8ff?style=for-the-badge&logo=airplane&logoColor=white)
![Powered by Llama](https://img.shields.io/badge/Llama%203.3-70B-00e676?style=for-the-badge&logo=meta&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Inference-f0b429?style=for-the-badge&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=for-the-badge&logo=vercel&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-181717?style=for-the-badge&logo=github&logoColor=white)

**An AI-powered, fully adaptive quiz platform for EASA Flight Dispatcher licence preparation.**  
*Dynamically generates unique exam-standard questions using open-source LLM inference — no two sessions are the same.*

[🚀 Live Demo](https://ai-adaptive-quiz-two.vercel.app) • [📋 How It Works](#how-it-works) • [ Architecture](#architecture) • [ Tech Stack](#tech-stack)

</div>

---

##  What This Project Does

**Dispatcher IQ** is a browser-based adaptive assessment tool built for EASA Flight Dispatcher licence candidates. Unlike static question banks, every question is **generated live by an AI model** — calibrated in real time to the student's current performance level.

Key behaviours:
- Starts at **Level 1** and adapts difficulty up/down after each answer
- Covers 3 core EASA domains across 10 questions per session
- Provides **immediate feedback** with ICAO/EASA regulatory citations after every answer
- Shuffles answer options to prevent pattern memorisation
- Shows a **personalised result certificate** at the end with rank title

---

##  Adaptive Engine

The difficulty engine follows a simple but effective rule:

```
Correct answer   →  Level UP   (max Level 10)
Incorrect answer →  Level DOWN (min Level 1)
```

Each level maps to a specific cognitive demand — from basic recall at Level 1 up to multi-constraint regulatory interpretation at Level 10. The AI prompt is updated dynamically with the current level descriptor, ensuring questions genuinely scale in complexity.

---

##  Knowledge Domains

| Domain | Sub-topics Covered |
|--------|--------------------|
| ✈️ **Aviation Navigation** | VOR/NDB/DME, ILS CAT I/II/III, RNAV/RNP, Great Circle vs Rhumb Line |
| 🌦️ **Aviation Meteorology** | METAR/TAF decoding, SIGMET categories, Icing types, PROB groups |
| 📋 **EASA Regulations** | Part-FCL, EU-OPS fuel policy, MEL/CDL, ETOPS authorisation |

Questions rotate through all three domains and cycle through specialist sub-topics to ensure broad coverage across the 10-question session.

---

##  Architecture

```
┌─────────────────────────────────────────────────────┐
│                   EVALUATOR'S BROWSER                │
│                                                      │
│   GitHub Pages → index.html                         │
│   (Enter name → Quiz starts immediately)            │
└──────────────────────┬──────────────────────────────┘
                       │  POST /api/chat
                       │  { prompt: "..." }
┌──────────────────────▼──────────────────────────────┐
│              VERCEL SERVERLESS FUNCTION              │
│                   api/chat.js                        │
│                                                      │
│   • Holds GROQ_API_KEY securely as env variable     │
│   • Key is NEVER sent to or visible in browser      │
│   • Handles rate limiting + model fallback          │
└──────────────────────┬──────────────────────────────┘
                       │  Bearer token (server-side only)
┌──────────────────────▼──────────────────────────────┐
│                    GROQ INFERENCE                    │
│           llama-3.3-70b-versatile (primary)         │
│           llama3-70b-8192 (fallback)                │
│                                                      │
│   Generates structured JSON question objects        │
│   with options, correct index, and EASA citation    │
└─────────────────────────────────────────────────────┘
```

**Why this architecture?**
- The API key never touches the browser — it lives only in Vercel's encrypted environment
- GitHub Pages hosts the static frontend for free with a permanent shareable URL
- Vercel's serverless function handles the secure Groq API call with zero cold-start infrastructure
- CORS is handled server-side so the frontend works from any domain

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla HTML/CSS/JS | Single-file quiz UI, no framework dependencies |
| **Fonts** | Rajdhani + Share Tech Mono | Aviation instrument aesthetic |
| **AI Model** | Llama 3.3 70B (Meta, open-source) | Question generation & explanation |
| **Inference** | Groq Cloud (free tier) | Ultra-fast LLM inference (~1-2s per question) |
| **API Proxy** | Vercel Serverless Function (Node.js) | Secure key handling, CORS, model fallback |
| **Hosting** | GitHub Pages | Free static frontend hosting |

---

##  Security Design

A key design decision was **never exposing the API key to the client**. Here's how it's handled:

```
❌ Wrong approach (common mistake):
   Browser → fetch('https://api.groq.com', { headers: { Authorization: 'Bearer gsk_...' }})
   // Key is visible to anyone in DevTools → Network tab

✅ This project's approach:
   Browser → fetch('/api/chat', { body: { prompt } })  // no key here
   Vercel  → fetch('https://api.groq.com', { headers: { Authorization: process.env.GROQ_API_KEY }})
   // Key is only in Vercel's encrypted environment variables
```

---

##  Project Structure

```
ai-adaptive-quiz/
│
├── index.html          # Complete quiz UI (adaptive engine, rendering, results)
├── vercel.json         # Vercel deployment config
├── package.json        # Node.js project metadata
│
└── api/
    └── chat.js         # Serverless proxy → Groq API (holds key securely)
```

---

##  How to Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/nandinidahiya/ai-adaptive-quiz.git
cd ai-adaptive-quiz

# 2. Install Vercel CLI
npm install -g vercel

# 3. Create local env file
echo "GROQ_API_KEY=gsk_your_key_here" > .env.local

# 4. Run locally (serves both frontend + API)
vercel dev
# → Open http://localhost:3000
```

---

##  Question Generation — Prompt Engineering

Each question is generated with a carefully structured prompt that includes:

1. **Topic & sub-topic** — rotated to ensure domain coverage
2. **Difficulty descriptor** — mapped from current level (1–10)
3. **Deduplication list** — previously asked questions to prevent repeats
4. **Output schema** — strict JSON with question, options array, correct index, and EASA citation

The model is instructed to place the correct answer at a **random position** each time, and the frontend applies an additional Fisher-Yates shuffle to further prevent position bias.

---

##  Sample Output

```json
{
  "question": "Under EU-OPS, what is the minimum final reserve fuel for a turbine-powered aeroplane?",
  "options": [
    "A. Fuel for 30 minutes at holding speed at 1500 ft above destination",
    "B. Fuel for 45 minutes at holding speed at 1500 ft above destination",
    "C. Fuel for 20 minutes at cruise altitude",
    "D. 10% of trip fuel"
  ],
  "correct": 1,
  "explanation": "EU-OPS 1.255 requires final reserve fuel sufficient for 45 minutes of flight at holding speed at 1500 ft above aerodrome elevation in ISA conditions."
}
```

---

<div align="center">

Built with focus on **secure API design**, **adaptive learning principles**, and **EASA regulatory accuracy**.

⭐ Star this repo if you found it useful

</div>
