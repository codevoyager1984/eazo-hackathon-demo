# Eazo Hacker Card ⚡

> An AI-powered developer identity card generator built for the [Eazo Weekend Jam SF](https://eazo.ai/build-weekend-jam-sf.html).

Open this app inside Eazo and it will:

1. Authenticate you via the Eazo iframe bridge (`session.getToken`)
2. Verify your identity on a serverless backend using `@eazo/node-sdk`
3. Ask Gemini to generate your personalized developer identity card
4. Let you share it on X (Twitter) or download it as an image

Can't open it in Eazo right now? Just fill in your nickname and a short self-description — the form fallback works standalone too.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Vercel Serverless Functions (Node.js ESM) |
| AI | Gemini 2.5 Flash via REST |
| Auth | Eazo iframe bridge + `@eazo/node-sdk` decrypt |
| Hosting | Vercel |

---

## How It Works

```
Browser (inside Eazo iframe)
  │
  ├─ postMessage → session.getToken
  │      └─ Eazo returns encrypted payload
  │             { encryptedData, encryptedKey, iv, authTag }
  │
  ├─ POST /api/verify
  │      └─ @eazo/node-sdk decrypt() with EAZO_PRIVATE_KEY
  │             returns { userId, email, nickname, avatarUrl }
  │
  └─ POST /api/generate-card
         └─ Gemini 2.5 Flash generates the card JSON
                { archetype, totem, roast }
```

The encrypted payload is **never decrypted in the browser** — it is forwarded to the backend, where your private key lives as an environment variable.

---

## Project Structure

```
eazo-hackathon-demo/
├── api/
│   ├── verify.js          # POST /api/verify — decrypt Eazo session token
│   └── generate-card.js   # POST /api/generate-card — Gemini card generation
├── src/
│   ├── main.jsx
│   ├── App.jsx            # Full UI: bridge auth, form fallback, card display
│   └── index.css
├── index.html
├── vite.config.js         # Dev proxy: /api → localhost:3000
├── vercel.json            # Build config + CSP headers for iframe embedding
└── .env.example
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your keys
cp .env.example .env

# 3. Start dev server (Vite on :5173, serverless functions on :3000)
vercel dev
```

> Tip: if you don't have the Vercel CLI, `npm run dev` starts the frontend only. API routes won't work without `vercel dev`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key — [get one here](https://aistudio.google.com/app/apikey) |
| `EAZO_PRIVATE_KEY` | Your 64-char hex ECC private key — generate it on the [Eazo Developer Settings](https://eazo.ai) page |

---

## Deploy to Vercel

```bash
vercel deploy
```

Add `GEMINI_API_KEY` and `EAZO_PRIVATE_KEY` to your Vercel project's environment variables, then set the deployment URL as the app URL inside Eazo.

The `vercel.json` already sets `Content-Security-Policy: frame-ancestors https: http:` so the app can be embedded in the Eazo iframe.

---

## Eazo SDK

Server-side decryption is powered by [`@eazo/node-sdk`](https://github.com/codevoyager1984/eazo-sdk):

```js
import { decrypt } from '@eazo/node-sdk';

const result = decrypt({
  encryptedData, encryptedKey, iv, authTag,
  privateKey: process.env.EAZO_PRIVATE_KEY,
});

console.log(result.data);
// { userId, email, nickname, avatarUrl, lang, region, createdAt }
```

---

## License

MIT
