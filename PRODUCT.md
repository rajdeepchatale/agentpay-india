# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — the buyer.** A woman in Delhi, Bangalore, or Pune who saw a Paithani saree
in an Instagram Reel and wants it. She types the way she talks: Hindi, Marathi, Hinglish,
or English, often mid-sentence code-mixed ("cotton saree dikhao 1000 ke under",
"मला पैठणी साडी दाखवा"). She is on a phone, in a DM-shaped mental model, and expects a
reply in seconds. She cannot walk into the shop — she is hundreds of kilometres away.

**Secondary — the merchant.** "Sakhi Sarees," a Pune boutique run by a woman entrepreneur
sourcing authentic Paithani from Yeola/Paithan weavers. She posts Reels that reach 50,000
views and receives 200+ DMs a day. She can personally answer 30–40. The remaining ~70% of
high-intent buyers drop off before payment. She already accepts money via Razorpay Payment
Links pasted into WhatsApp.

**Tertiary — autonomous AI buyers.** Assistants (Gemini, ChatGPT, Siri) acting on a user's
instruction to find and buy a product. They transact with whichever merchant is
machine-readable.

## Product Purpose

AgentPay India turns a small merchant's catalog into an AI-transactable, voice-enabled,
guardrailed commerce endpoint. A buyer chats in her own language; the agent finds products,
enforces spending limits, requires explicit consent, creates a real Razorpay order with a
payment link, and logs every decision with its reasoning.

Success is the merchant's 200 daily DMs all getting answered, 24/7, in the buyer's language,
with checkout completed inside the conversation instead of hours later in a manual thread.

## Positioning

Razorpay made Zomato, Swiggy, and Zepto AI-transactable. AgentPay makes the neighborhood
saree store AI-transactable — with the same guarantees.

The mechanism a neighboring product could not truthfully copy: **guardrails are architecture,
not a prompt.** Spending caps, consent gating, and rate limits are enforced in a
deterministic engine that sits outside the LLM and gates tool execution before any Razorpay
call fires. An LLM that hallucinates a discount or skips consent cannot spend money, because
it was never the thing holding the wallet.

## Operating Context

The buyer's real scene is a lit phone screen, one hand, often at night, inside a chat
surface she associates with Instagram DMs and WhatsApp. She switches scripts mid-sentence
without thinking about it. Devanagari and Latin appear in the same line constantly.

The merchant's world is physical and material: handloom and powerloom, warp and weft, zari
(real gold-wrapped thread), the kaath (woven selvedge border running the saree's length),
the pallu (the decorated end that drapes over the shoulder), and motifs with names —
mor (peacock), asawali (vine), bangdi mor (bangle-peacock), amba (mango). A Yeola Paithani
takes 15–20 days on the loom. This vocabulary is factual, not decorative: it is how the
merchant and her buyers actually describe the goods.

The demo is judged by Razorpay engineers at the AI Buildathon 2026 (Track 01), largely
through a 5-minute video in which the chat surface holds the screen for ~90 seconds.

## Capabilities and Constraints

**Confirmed functionality:** multilingual chat (hi / mr / en / hinglish); catalog search over
16 sarees in three price tiers; real Razorpay test-mode orders and payment links; spending-cap
and consent guardrails; graceful failure handling; voice in and out via Sarvam AI; an audit
trail with per-decision reasoning.

**Technical constraints:**
- Next.js 16.3.4 / React 19.2.8, App Router, TypeScript, `src/`, `@/*` alias.
  (Earlier plans said "Next.js 14" — wrong. The installed version wins.)
- **Vanilla CSS only.** No Tailwind, no CSS-in-JS.
- **Dependencies stay minimal by choice.** No icon library, no animation
  library, no component kit. Every icon is an authored inline SVG on one grid.
- One agent owns the whole repository. There is no file-ownership boundary.
- Work is step-gated: one step is built and verified, then the next begins.
  A single AI coding agent is the sole builder as of Sep 2.

**Terminology that must stay accurate:** saree names and their Devanagari forms come from the
seeded catalog and are not to be paraphrased or invented.

## Brand Commitments

- Product name: **AgentPay India**. Demo merchant: **Sakhi Sarees, Pune**.
- Pinned palette (exact, from the brief): base `#0a0a0f`, surface `#141419`, elevated
  `#1c1c24`, accent saffron `#f97316`, text `#f0f0f5` / `#8b8b9e` / `#5a5a6e`, success
  `#22c55e`, warning `#f59e0b`, error `#ef4444`, info `#3b82f6`.
- Dark theme, confirmed by the use scene (a phone at night, a video shot in a dim room).
- Default spending cap is **₹1,000**, not ₹500.
- User-pinned visual world: **woven / zari** — surfaces read as cloth with a warp-weft
  structure; borders behave like zari thread; gold is the second accent beside saffron.
- User-pinned typography: **Ek Type** (Mumbai foundry) — Anek Devanagari for display,
  Mukta for UI and body, both covering Devanagari and Latin in one design system.
  JetBrains Mono for order IDs and audit data.
- Devanagari is a first-class script, never a fallback.

## Evidence on Hand

- Real: 16 seeded products with authentic Devanagari names, prices ₹499–₹24,999, in
  `src/lib/catalog/data.ts`. A working `GET /api/catalog`. Complete API type contracts in
  `src/types/index.ts`.
- Real: Razorpay test-mode credentials produce genuine `order_*` IDs and `rzp.io` links.
- **Absent, must not be fabricated:** product photography. Every `image_url` points at a
  file that does not exist; the UI must degrade to an authored fallback rather than a broken
  image. There are no real customers, testimonials, transaction volumes, merchant revenue
  figures, or press. "Sakhi Sarees" is a representative demo merchant, not a signed client,
  and must never be presented as an existing customer.
- All four API keys are installed and verified live: Gemini, Razorpay,
  Supabase, Sarvam. The agent, guardrails and audit trail are built and
  working end to end.

## Product Principles

1. **The guardrail is the product.** The moment the agent refuses to overspend is the most
   important moment in the demo. Design it as protection the buyer is glad to have, never as
   a denial screen.
2. **Both scripts are native.** Hindi, Marathi, and Latin sit on the same baseline with the
   same texture. A visible seam where the script changes is a defect.
3. **Never show a broken state to a buyer.** Missing images, failed payments, out-of-stock
   items, and network errors each resolve into something authored, with a way forward.
4. **Speak the merchant's material vocabulary.** The interface borrows its structure from
   cloth because the product is cloth. This is grounding, not ornament.
5. **Real over mocked.** The order IDs are real, the links are real, and the interface should
   make that legible rather than asking to be trusted.

## Accessibility & Inclusion

Devanagari rendering at readable sizes is a functional requirement, not a nicety. Contrast
must hold at 4.5:1 for body text on the dark ground. The primary demo device is a phone;
375px is a supported width, not an afterthought. Keyboard operation and visible focus are
required for the chat input, which is the product's main control.
