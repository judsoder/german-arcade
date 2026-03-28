# Schattensprache — German Shadowing Arcade

A tight, beautiful shadowing arcade for spoken German practice. Hear a phrase, shadow it, notice one word.

**Live:** [german-arcade.vercel.app](https://german-arcade.vercel.app)

## What it is

A browser-based shadowing tool. Each session gives you 5 German phrases across 5 registers (everyday, literary, travel, emotional, expressive). For each phrase:

1. **Listen** — the browser reads the phrase aloud (TTS)
2. **Shadow** — you repeat it, optionally into the microphone (STT)
3. **Notice** — a single word or construction is spotlighted with a note about why it matters

The app tracks word-match accuracy (not pronunciation), streaks, and which phrases you've struggled with. Weak phrases resurface in future sessions.

## What's real and what's limited

| Feature | Status |
|---|---|
| German TTS playback | ✅ Works in all major browsers (quality varies by OS/browser) |
| Speech recognition (STT) | ⚠️ Chrome/Edge only. Uses Web Speech API — not available in Safari/Firefox |
| Word-match scoring | ✅ Longest-common-subsequence comparison of recognized words vs. target |
| Pronunciation evaluation | ❌ Not attempted. The app explicitly does not judge pronunciation |
| Phrase bank | ✅ 28 curated phrases across 5 categories, 3 difficulty tiers |
| Session persistence | ✅ localStorage — tracks sessions, streaks, weak phrases, saved Merkwörter |
| Merkwörter collection | ✅ Save notice words to a personal shelf for review |
| Backend / auth | ❌ None. Fully client-side |
| Curriculum / spaced repetition | ❌ Not a curriculum app. Weak phrases resurface but there's no SRS algorithm |

### Browser support

- **Chrome / Edge (desktop & Android):** Full experience — TTS + STT + scoring
- **Safari / Firefox:** Listen-only mode — TTS works, but no speech recognition. You can still read, listen, and shadow silently. The app adapts its UI accordingly.
- **Mobile Safari:** TTS works. STT unavailable.

## Tech

- Next.js 16, React 19, Tailwind CSS 4
- Browser-native Web Speech API (no external speech services)
- localStorage for persistence
- No backend, no API keys, no auth

## Running locally

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Phrase bank

28 phrases across 5 categories:
- ☕ **Alltag** — everyday speech
- 📖 **Literatur** — literary & reflective
- 🗺 **Unterwegs** — travel situations
- 💭 **Gefühle** — emotional language
- ✦ **Ausdruck** — expressive & personal

Each phrase includes a "Wort zum Merken" — a single word or construction worth noticing, with a note about grammar, register, or cultural context.

## What this is not

This is not a pronunciation trainer, a grammar course, or a curriculum. It's a shadowing arcade: a small, focused tool for getting German phrases into your mouth and one interesting word into your head, five rounds at a time.
