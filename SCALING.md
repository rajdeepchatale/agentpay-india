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
> One toggle, and a merchant is reachable — by human buyers in their own
> language today, and by AI buyers as the protocols land.**

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

For a merchant **already on Razorpay**, distribution is trivial: no new signup,
no new KYC, no integration project. A toggle in a dashboard she already logs
into.

### And the sellers who are not on Razorpay?

Most of the 60 million are not, and it is worth being exact about this rather
than letting the sentence above carry more than it should.

**They would need a Razorpay account first. Nothing here removes that step**,
and this project should not be read as claiming otherwise.

But that is the growth argument, not a hole in it:

> **Nobody wants a payment gateway.** She wants the hundred and seventy
> conversations she loses every day. If the AI shopkeeper runs on Razorpay's
> rails, then the shopkeeper is the reason to open the account — and the
> account is a consequence, not the pitch.

Two things make that more than a slogan:

- **The friction is smaller than it sounds.** A seller already taking UPI QR
  payments has a bank account and does business digitally. Razorpay onboarding
  is an existing funnel with an existing conversion rate — not a new problem
  this project has to solve.
- **This is the AI *Growth* track.** Growth means merchants who are not on the
  platform yet, not only more volume from the ones who are. An agent that only
  runs on Razorpay's rails is a reason to be on them.

And where it genuinely stops: a seller who wants nothing to do with a payment
provider at all is not reachable by this, and that is fine. **The claim is not
60 million users. It is 60 million who are reachable on rails that already
exist.**

And the delivery mechanism already exists too. A **Payment Link** is created in
that dashboard and pasted into WhatsApp; a **Payment Page** is a hosted,
no-code storefront. Neither asks a merchant to own a website or hire a
developer.

**This is shaped like a Payment Page that talks back** — she gets a URL and
pastes it in her bio, and the shape is the part that is already true: the
`/chat` link in this repo is a link, not an app she had to build.

Where the analogy stops matters as much as where it holds. A Payment Page is
created by the merchant herself, from a dashboard Razorpay hosts. What exists
here is one merchant's shop with a seeded catalog — **the self-serve creation
and the catalog ingestion above are argued, not built.** The end state removes
the link entirely, with the agent running inside her existing WhatsApp number,
where the DMs already arrive.

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
consume. **Discovery is built**: an agent can find this merchant and read the
prices, today, without a bespoke integration.

Be exact about where that stops. **Autonomous agent-to-agent purchase is not
built.** An AI can read the catalog; it cannot complete a checkout on its own.
Track 01 offers "transactable by an AI buyer end to end" as the *other* branch
of an "or", and this project took the revenue branch. The landing page says the
same thing in the same words, deliberately.

The forward path:

1. **Razorpay MCP server** — expose merchant catalogs directly to external
   agent runtimes (Claude, ChatGPT, Gemini), so an AI buyer transacts without
   a bespoke integration.
2. **NPCI Unified Agentic Protocol (UAP)** — align with national agentic
   payment standards as they land.
3. **WhatsApp Business webhook** — deploy the agent into the merchant's
   existing WhatsApp number, where the DMs already arrive.

---

## Two limits found by running it, not by planning

The rest of this document argues. This section does not — both of these were
measured in production, and both are the kind of thing a scaling plan usually
discovers too late.

**Razorpay test mode caps payment links at 30.** Orders are uncapped; links are
not. Past that ceiling the system reuses links that are still unpaid, and an
order created with none available comes back without a Pay Now button rather
than failing — the order is the thing that matters, and it exists at Razorpay.
In production the cap does not apply, but the lesson does: **the scarce resource
was not compute or tokens, it was a quota nobody had read.**

**One model provider is a single point of failure.** On 4 Sep, Google returned
`503 UNAVAILABLE` on the pinned model and every buyer got a connection error —
no deploy, no code change. Measured across the key that afternoon, four of six
models were unavailable and one was ten times slower than usual. The fix was a
fallback chain in
[`gemini.ts`](src/lib/agent/providers/gemini.ts) that walks models on 429,
5xx and timeouts, and fails fast on 400/403/404 where the next model would fail
identically. Full write-up: [`CHALLENGES.md`](CHALLENGES.md) #19.

Neither of these appears in an architecture diagram. Both would have taken a
merchant's shop offline.

---

## What is demonstrated vs. what is argued

Honesty matters here; judges can tell the difference.

**Demonstrated in the build**
- A working agent that searches, gates, and transacts in four languages
- Real Razorpay test-mode orders and payment links
- Guardrails enforced outside the model, with an audit trail
- A machine-readable catalog endpoint

**Argued, not built** — and labelled as such
- Route-based multi-merchant settlement
- Instagram catalog ingestion
- The Razorpay dashboard toggle
- MCP / UAP exposure
- **A second merchant.** The live catalog is one merchant, `merch_test_001`,
  seeded by hand. There is no self-serve creation, so a real merchant cannot
  onboard herself today — say that plainly rather than letting a reader assume
  otherwise. The data model is already keyed by merchant; the flow that would
  fill it is not built.

Nothing in this document should be presented as shipped. The architecture is
the claim; the demo is the evidence that the hard part — an agent that handles
money safely — already works.
