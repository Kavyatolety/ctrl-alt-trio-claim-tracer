# Claim Tracer

Claim Tracer turns pasted text into independently verifiable claims, searches for credible evidence, and labels each claim **Sourced**, **Weakly Sourced**, or **Untraceable** with a transparent confidence breakdown.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your OpenAI API key to `.env.local` (never commit it).
3. Run `pnpm install`, then `pnpm dev`.
4. Open the local URL printed by the development server.

The app uses the OpenAI Responses API with web search and strict structured output. The API key is read only by the server route.

Without an OpenAI key, the application remains functional in clearly labeled **Limited evidence mode**. It extracts factual sentences and performs live searches against Wikipedia's public API. This fallback never labels secondary reference material as fully sourced and does not pretend to provide GPT verification.

## Limitations

Claim Tracer cannot prove absolute truth or falsity. Evidence can be missing, recent, paywalled, poorly indexed, or outside the searchable web. “Untraceable” means insufficient evidence was located—not that a claim is false.

## Team

ctrl+alt+trio · DevFest DC 2026
