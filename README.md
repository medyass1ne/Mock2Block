<p align="center">
  <h1 align="center">⚡ Mock2Block</h1>
  <p align="center">
    <strong>Instantly design, generate, test, and deploy full CRUD mock APIs — entirely from your browser.</strong>
  </p>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/AI-Groq_Llama_3-orange?style=flat-square" alt="Groq AI" />
</p>

<br />

> **Stop waiting for backend teams.** Mock2Block lets frontend developers visually scaffold an Express.js server with full CRUD endpoints, test them in an in-browser sandbox, or deploy them to a live cloud URL in seconds — all powered by a dark glassmorphism UI, AI generation, and zero backend setup.

<br />

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📸 Screenshots](#-screenshots)
- [🚀 Getting Started](#-getting-started)
- [🔑 Environment Variables](#-environment-variables)
- [🧠 Architecture / How It Works](#-architecture--how-it-works)
- [👨‍💻 Author](#-author)
- [📄 License](#-license)

---

## ✨ Features

### 🎨 Visual API Builder
Design your mock API resources and fields through an intuitive drag-and-drop-style interface. Instantly generates a **complete, runnable `server.js`** file with full `GET`, `POST`, `PUT`, and `DELETE` endpoints, in-memory data seeding, configurable CORS, and simulated latency — ready to download and run with a single `node server.js`.

### 🤖 AI-Powered Generation
Type a plain English description like *"A blog platform with posts, comments, and authors"* and let **Groq's Llama 3** instantly generate your entire API schema. Integrated with server-side **rate limiting** (3 requests/day per user via Vercel KV) to prevent abuse.

### 📄 Smart File Uploads
Upload existing API documentation in **`.json`**, **`.md`**, **`.txt`**, **`.html`**, or **`.pdf`** formats. PDFs are parsed **entirely client-side** using `pdfjs-dist` to extract text before sending to the AI — keeping payloads lean and protecting server limits. Extracted text is automatically **truncated at 25,000 characters** to fit within the LLM context window.

### 🧪 In-Browser Virtual Sandbox
Test your generated endpoints directly inside the UI — like a **mini Postman**. The virtual request dispatcher handles `GET`, `POST`, `PUT`, and `DELETE` operations against an in-memory store, with configurable **simulated network latency** and a one-click "Reset Data" button.

### ☁️ Cloud Deployments
Deploy your mock API to the cloud with a single click. Your endpoints go live at a unique URL (e.g., `https://your-domain.com/projects/{id}/test/api/todos`) powered by **Next.js dynamic Catch-All Route Handlers** and **Vercel KV** for persistence — no Express server needed.

### 🔐 Custom Authentication
A complete JWT authentication system built **from scratch** — no NextAuth, no Clerk, no Auth.js. User registration and login with **bcryptjs** password hashing, HTTP-only JWT cookies, and server-side token verification across all protected routes. Users get a personal **dashboard** to manage their deployed projects.

### 💎 Premium Dark Glassmorphism UI
A meticulously crafted interface featuring translucent glass panels, dynamic spotlight effects, **Framer Motion** animations (staggered fade-ups, scale transitions, layout animations), skeleton loading states with `animate-pulse`, and **server-side auth extraction** to eliminate hydration layout shift.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router), Pure JavaScript (no TypeScript), Tailwind CSS 4, Framer Motion |
| **Backend / Serverless** | Next.js Route Handlers, Custom JWT Auth (`jsonwebtoken`, `bcryptjs`) |
| **Database** | Vercel KV (Upstash Redis) |
| **AI** | Groq API (Llama 3), Server-side rate limiting |
| **File Processing** | `pdfjs-dist` (client-side PDF text extraction) |
| **Deployment** | Vercel |

---

## 📸 Screenshots

> *Coming soon — screenshots of the Builder, AI Generation, API Tester, Dashboard, and Cloud Deploy flow.*

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ installed on your machine
- A **Vercel KV** (Upstash Redis) database
- A **Groq API** key for AI generation

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/medyass1ne/Mock2Block.git
cd Mock2Block

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Then fill in your actual keys (see table below)

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start building your mock API.

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root with the following variables:

| Variable | Description | Example |
|---|---|---|
| `KV_REST_API_URL` | Your Vercel KV (Upstash Redis) REST API URL | `https://your-instance.upstash.io` |
| `KV_REST_API_TOKEN` | Authentication token for Vercel KV | `gQAAA...` |
| `KV_REST_API_READ_ONLY_TOKEN` | Read-only token for Vercel KV | `ggAAA...` |
| `KV_URL` | Full Redis connection URL | `rediss://default:...@host:6379` |
| `JWT_SECRET` | Secret key for signing JWT tokens (use a strong random string) | `your-super-secret-key-here` |
| `GROQ_API_KEY` | API key from [Groq Console](https://console.groq.com) | `gsk_...` |

---

## 🧠 Architecture / How It Works

Mock2Block leverages the **Next.js App Router** to eliminate the need for a persistent Express backend in production:

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Visual       │  │ AI Generator │  │ API Tester │ │
│  │ Builder UI   │  │ (Groq/PDF)   │  │ (Sandbox)  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘ │
└─────────┼─────────────────┼──────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────┐
│              Next.js Route Handlers                  │
│                                                      │
│  /api/deploy          → Save to Vercel KV            │
│  /api/generate        → Groq AI + Rate Limiting      │
│  /api/auth/[action]   → JWT Register/Login/Logout    │
│  /api/projects        → List user's saved projects   │
│                                                      │
│  /projects/[id]/test/api/[...slug]                   │
│    └─ Dynamic catch-all route that reads project     │
│       data from KV and serves live CRUD responses    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Vercel KV     │
              │ (Upstash Redis) │
              │                 │
              │ project:{id}    │
              │ user:{username} │
              │ ratelimit:{usr} │
              └─────────────────┘
```

**The key insight:** When a user deploys their mock API, the config and seed data are serialized and stored in Vercel KV. The **`[...slug]` catch-all Route Handler** then intercepts any incoming HTTP request to that project's URL, parses the method and path, and returns the appropriate CRUD response — all serverlessly, with zero infrastructure to manage.

---

## 👨‍💻 Author

Built with ☕ and obsessive attention to UI detail by **Yessin**.

- GitHub: [@medyass1ne](https://github.com/medyass1ne)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>If you found this useful, please consider giving it a ⭐</strong>
</p>
