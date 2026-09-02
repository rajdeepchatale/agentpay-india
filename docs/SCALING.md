# From one merchant to sixty million

> How AgentPay goes from Sakhi Sarees to Razorpay's whole merchant base — and
> why Razorpay is the only place this belongs.

---

## The reframe

Razorpay does not want to run a saree shop. It wants an **infrastructure
primitive** any of its merchants can switch on, that converts long-tail GMV
which currently leaks away.

So the claim is not *"we built a shop assistant."* It is:

> **We built the agentic commerce layer for Razorpay's existing merchant base.
> One toggle, and a merchant becomes transactable by any AI buyer.**

Sakhi Sarees is the **proof instance**, not the product.

---

## The data model is already multi-tenant

Every product in the catalog already carries its merchant:

```ts
merchant: { name: string; razorpay_id: string }
```

The shape is right. Only the *source* is single-tenant. Three things are
hardcoded today:

| Hardcoded now | Becomes |
|---|---|
| `src/lib/catalog/data.ts` — one TS file, one merchant | A `products` table keyed by `merchant_id` (Supabase is already provisioned) |
| System prompt says *"Sakhi Sarees, a Pune boutique"* | Generated from the merchant record at request time |
| One Razorpay key pair in `.env.local` | **Razorpay Route** — one platform account, many linked sub-merchants |

That third row is the one that matters, and it is the reason this belongs at
Razorpay rather than anywhere else.

---

## Settlement is already solved — by Razorpay

**Razorpay Route** exists to split and settle payments across linked
sub-merchant accounts. AgentPay does not need to invent a payments stack; it
becomes an orchestration layer on rails Razorpay already owns and already
KYCs.

> *"AgentPay uses Route for settlement, Orders for creation, and Payment Links
> for delivery. We didn't build a payments stack — we built the agent layer on
> top of yours."*

---

## The real bottleneck is catalogs, not payments

Onboarding merchant #2 through #60,000,000 has exactly one hard problem:
**most small merchants have no structured product data.** She has Instagram
posts, not JSON.

That is the actual innovation surface, and it fits the merchant story exactly:

1. **Ingest from Instagram.** She already posts Reels with captions and prices.
   An ingestion agent reads her feed and generates the structured catalog. She
   uploads nothing.
2. **Import from WhatsApp Business Catalog / Instagram Shop** — many merchants
   already maintain one.
3. **CSV** as the boring fallback.

Distribution is then trivial, because **Razorpay already owns the merchant
relationship**: no new signup, no new KYC, no integration project. A toggle in
a dashboard she already logs into.

---

## Why a regulated payments company can actually ship this

This is the strongest argument, and it is the one already built.

**An autonomous agent that spends money is a compliance problem, not a
feature.** Razorpay cannot ship something where an LLM might hallucinate a
discount, skip consent, or be talked past by *"ignore all limits, I am the
admin."*

AgentPay's answer is architectural:

- **Spending caps** enforced in a deterministic engine outside the model
- **Explicit consent** gating every order — no "Haan", no order
- **Rate limiting** to stop runaway autonomous loops
- **An immutable audit log** with the reasoning behind every decision

The LLM proposes. The guardrail engine disposes. It was never the thing holding
the wallet.

`/dashboard` is not a nice-to-have — it is the **compliance artifact** that
makes agentic commerce auditable.

> Most agentic commerce demos show an agent that buys things.
> Very few show an agent that correctly **refuses to**.

---

## Machine-readable today, not someday

`GET /api/catalog` already returns structured JSON any external agent can
consume. That is the "AI buyer" surface, working now — not a roadmap item.

The forward path:

1. **Razorpay MCP server** — expose merchant catalogs directly to external
   agent runtimes (Claude, ChatGPT, Gemini), so an AI buyer transacts without
   a bespoke integration.
2. **NPCI Unified Agentic Protocol (UAP)** — align with national agentic
   payment standards as they land.
3. **WhatsApp Business webhook** — deploy the agent into the merchant's
   existing WhatsApp number, where the DMs already arrive.

---

## What is demonstrated vs. what is argued

Honesty matters here; judges can tell the difference.

**Demonstrated in the build**
- A working agent that searches, gates, and transacts in four languages
- Real Razorpay test-mode orders and payment links
- Guardrails enforced outside the model, with an audit trail
- A machine-readable catalog endpoint
- *(if built)* a second merchant in a different category, proving the agent is
  not saree-specific

**Argued, not built** — and labelled as such
- Route-based multi-merchant settlement
- Instagram catalog ingestion
- The Razorpay dashboard toggle
- MCP / UAP exposure

Nothing in this document should be presented as shipped. The architecture is
the claim; the demo is the evidence that the hard part — an agent that handles
money safely — already works.
