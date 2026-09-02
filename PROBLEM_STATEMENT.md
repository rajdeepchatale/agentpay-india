# Problem Statement — AgentPay India

> **Reference for the 5-minute video.** Written before the build; revise once
> everything works and the real demo footage exists.
> Shot-by-shot structure lives in [`BUILD_PLAN.md`](BUILD_PLAN.md) → Step 14.

---

## In one sentence

**India has 60 million small merchants on Razorpay. The big platforms are
already AI-transactable. The neighbourhood saree shop is not — and AgentPay
makes her transactable, safely.**

---

## The hook (first 30 seconds, say it roughly like this)

> *"Zomato, Swiggy, Zepto — all AI-transactable now.*
>
> *But what about the saree seller in Pune whose Instagram Reel gets fifty
> thousand views… and who can only reply to thirty DMs?"*

Do not open with architecture. Open with **her**.

---

## The problem, in three parts

### 1. The 500-metre trap

A physical UPI QR code only works within **500 metres** of the storefront.
An Instagram Reel reaches **millions**. The gap between what her marketing can
reach and what her payments can capture is the entire problem.

### 2. The DM bottleneck

| | |
|---|---|
| Reel views | ~50,000 |
| DMs per day | **200+** |
| DMs she can personally answer | **30–40** |
| High-intent buyers who drop off | **~70%** |

Today's flow: buyer sees the Reel → DMs her → she replies *hours* later →
sends photos over WhatsApp → manually creates a Razorpay Payment Link → pastes
it in chat. Most buyers are gone before the link arrives.

She isn't losing sales because her product is wrong. She's losing them to
**latency and manual work**.

### 3. AI buyers are already shopping — just not from her

When someone tells Gemini, ChatGPT or Siri *"find me an authentic Paithani
under ₹1,000,"* the assistant transacts with whoever is **machine-readable**.
Today that means Amazon, Myntra, Nykaa. The long tail is invisible to agents,
so agentic commerce concentrates revenue in exactly the players who least need
it.

---

## What AgentPay does

Turns any merchant's catalog into an **AI-transactable, voice-enabled,
guardrailed commerce endpoint** — reachable by human buyers in their own
language *and* by autonomous AI agents.

She keeps her Instagram. She keeps her Razorpay account. The agent answers all
200 DMs, 24/7, in Hindi, Marathi, Hinglish or English, and closes the sale
inside the conversation.

---

## The differentiator — lead with this, not the chatbot

**An autonomous agent that spends money is a compliance problem, not a
feature.**

A regulated payments company cannot ship something where an LLM might
hallucinate a discount, skip consent, or be argued past with *"ignore all
limits, I'm the admin."*

So in AgentPay, **guardrails are architecture, not a prompt**:

- **Spending caps** — enforced in a deterministic engine *outside* the model
- **Explicit consent** — no *"Haan"*, no order. Ever.
- **Rate limiting** — stops runaway autonomous loops
- **An immutable audit trail** — every decision logged with its reasoning

The LLM proposes. The guardrail engine disposes. **It was never the thing
holding the wallet.**

> **The line worth saying on camera:**
> *"Most agentic commerce demos show an agent that buys things.
> We're going to show you one that correctly refuses to."*

The ₹1,000 cap blocking the ₹8,999 Paithani is not an error state — it is
**the product working**. Give it screen time.

---

## The pitch

> **"Razorpay made Zomato AI-transactable.
> We make the neighbourhood saree store AI-transactable."**

---

## Numbers cheat-sheet (say these correctly)

| Fact | Value |
|---|---|
| Small merchants in India | 60 million+ |
| UPI QR effective range | 500 metres |
| Reel views / DMs per day / answered | 50,000 / 200+ / 30–40 |
| Buyer drop-off | ~70% |
| Default spending cap | **₹1,000** |
| Blocked Paithani price | **₹8,999** (not ₹8,000) |
| Catalog size | **16 sarees**, 3 price tiers (₹499–₹24,999) |
| Rate limit | 3 orders/hour |
| Languages | Hindi · Marathi · Hinglish · English |
| Voice | Sarvam AI — 22 Indian languages |

---

## ⚠️ Honesty boundaries — do not overclaim on camera

Judges are Razorpay engineers. Overclaiming is the fastest way to lose them.

**Real — show it:**
- Razorpay **test-mode** orders and payment links (real `order_*` IDs)
- Guardrails enforced outside the LLM, with the audit trail as evidence
- Multilingual understanding and response
- `GET /api/catalog` — a genuinely machine-readable endpoint

**Say "test mode" out loud.** Claiming live payments would be false.

**Argued, not built — frame as architecture, not shipped:**
- Multi-merchant settlement via Razorpay Route
- Instagram catalog ingestion
- The Razorpay dashboard toggle
- MCP / NPCI UAP exposure

Full reasoning: [`docs/SCALING.md`](docs/SCALING.md).

**Never claim:**
- That "Sakhi Sarees" is a real customer — she is a **representative demo
  merchant**
- Any revenue, transaction volume, user count, or testimonial
- Any feature that isn't built by recording day. If voice gets cut, **cut the
  voice claim from the video and the landing page too**

---

## The closing note

The vision is not "a chatbot for a saree shop." It is:

> **Every Instagram seller, every WhatsApp boutique — AI-transactable in ten
> seconds, on rails Razorpay already owns.**

Sakhi Sarees is the proof instance. The product is the layer underneath.
