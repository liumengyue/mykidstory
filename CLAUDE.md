# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run pages:build  # Build for Cloudflare Pages deployment
```

No test framework is configured in this project.

## Architecture

**MyKidStory** is a Next.js 15 (App Router) app that generates personalized Chinese-language children's stories via AI and synthesizes them to audio.

### API Routes (Edge Runtime)

Both routes use `export const runtime = 'edge'` for Cloudflare/Vercel edge deployment.

- **`app/api/generate-story/route.js`** — Calls SiliconFlow API (DeepSeek-V3 model) to generate a 4-paragraph story based on character, scene, theme, child input, and length. Length maps to word count: 短=100, 中=200, 长=400 words.
- **`app/api/tts/route.js`** — Calls ByteDance Volcano TTS API with a female Chinese voice (`zh_female_vv_uranus_bigtts`), returns base64-encoded MP3.

### Frontend (`app/page.tsx`)

Single client component with all state managed via React hooks. No routing beyond the home page, no database — fully stateless.

Audio playback uses a specific stabilization sequence for mobile compatibility: base64 → Blob → Object URL → `audio.load()` → wait for `oncanplaythrough` → play. Don't simplify this sequence; it exists to prevent mobile playback failures.

### Environment Variables

Required in `.env.local` (no `.env.example` exists):

| Variable | Purpose |
|---|---|
| `SILICONFLOW_API_KEY` | DeepSeek story generation |
| `VOLC_ACCESS_KEY` | ByteDance Volcano TTS |
| `VOLC_APP_ID` | ByteDance Volcano TTS app ID |

### Styling

Tailwind CSS 4 via `@tailwindcss/postcss`. Component styles in `page.tsx` use inline style objects alongside Tailwind classes.
