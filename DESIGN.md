# Design

Recorded from the built system after Step 2, not from intention.
World: **woven / zari** · seed `a527c7f3` · mode: operate.

## The idea

Surfaces are cloth, not glass. The product sells handloom, so the interface is
built from the merchant's own material: every panel carries a warp-and-weft
micro texture, and hairlines behave like zari — the gold-wrapped thread woven
into a Paithani border — brightening where they catch light.

Two roles that must never swap:

| | Role | Where it appears |
|---|---|---|
| **Zari gold** | A *material*. Thread. | Hairlines, selvedge bands, order IDs |
| **Saffron** | A *decision*. The action that spends money. | One primary button per view |

Keeping these apart is what stops two adjacent warm hues turning to mud. A
screen with three saffron buttons has told the buyer nothing.

## Tokens

All in `src/app/globals.css` under `:root`.

**Ground** `--bg-primary #0a0a0f` · `--bg-surface #141419` ·
`--bg-elevated #1c1c24` · `--bg-sunken #07070b`

**Saffron** `--accent-primary #f97316` (+ `-hover #fb8a3c`, `-press #e26310`,
`-glow`, `-wash`)

**Zari** `--zari #c9a227` · `--zari-bright #f2d98a` · `--zari-dim rgba(201,162,39,.42)`

**Text** `--text-primary #f0f0f5` (17.4:1) · `--text-secondary #8b8b9e` (5.9:1) ·
`--text-muted #5a5a6e` (3.0:1)

> `--text-muted` measures **3.03:1** on this ground and fails the 4.5:1 body
> floor. It is reserved for non-essential micro-labels. Body copy and
> placeholders use `--text-secondary`. This was a real defect found in review.

**Semantic** success `#22c55e` · warning `#f59e0b` · error `#ef4444` ·
info `#3b82f6` · handled `#fb923c` (a recovered failure is orange, not red —
the agent dealt with it)

**Materials** `--weave-warp` / `--weave-weft` (crossing 1px repeating gradients
on a 3px period) · `--zari-thread` (gradient whose peak carries ~0.92 alpha;
below ~0.8 it stops reading as metal and becomes a grey hairline)

**Space** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80
**Radius** xs 4 · sm 8 · md 12 · lg 16 · xl 22 · full — assigned by role, not
sprayed evenly.

## Type

Ek Type of Mumbai, so Devanagari and Latin come from one design rather than
being bolted together. `cotton साडी dikhao` has no seam.

| Role | Face | Token |
|---|---|---|
| Display, headings, wordmark | **Anek Devanagari** (variable) | `--font-display` |
| UI, body, chat | **Mukta** (300–700) | `--font-ui` |
| Order IDs, amounts, audit | **JetBrains Mono** (variable) | `--font-mono` |

Scale runs `--fs-xs` 12 → `--fs-4xl` 60. Money and IDs always carry
`font-variant-numeric: tabular-nums` so digits cannot reflow between frames.

## Motion

**Snap, overshoot, settle. Nothing glides.**

The overshoot lives in the `snapIn` keyframes (70% at `translateY(-2px)`),
never in the timing function — an elastic bezier on top of those keyframes
double-bounces, which the detector correctly flags. Timing is
`--ease-out-expo cubic-bezier(.16,1,.3,1)`.

Keyframes: `messageIn` · `snapIn` · `typingDot` · `zariSheen` · `shimmer` ·
`recPulse` · `spin` · `overlayIn`. All suppressed under
`prefers-reduced-motion`.

## Components

`src/components/ui/` — `Button` (primary / secondary / ghost × sm / md / lg,
`iconOnly`, `round`, `loading`), `Card` (7 tones, woven `band`, `interactive`),
`Badge` (8 tones incl. `zari`, `mono`), `Input` (prefix / suffix / hint /
error), `Modal` (focus trap, Escape, scroll lock, focus restore), `Icon`.

`src/components/chat/` — `ChatContainer`, `MessageBubble`, `ProductCard`,
`GuardrailAlert`, `ConsentPrompt`, `OrderConfirmation`, `FailureCard`,
`ErrorCard`, `TypingIndicator`, `SuggestionChips`, `SettingsModal`,
`ChatInput`. Logic lives in `src/lib/chat/` (`machine`, `session`, `swatch`)
so the rules that matter are provable without a browser.

**The selvedge.** `GuardrailAlert` is the one place this system spends its
boldness. A *kaath* is the reinforced woven border that stops a saree
unravelling — the same job a spending cap does — so the block is built as an
edge the spend runs into. The bar's track is what she asked to spend and the
limit is a marked fraction of it, which turns ₹8,999-against-₹1,000 into a
ratio you see rather than two numbers you compare.

Two things learned building it: the within/over segments must differ in
*material*, not just hue — both solid gold merged into one run — and the limit
edge has to stand proud of the track to read at all.

**Image fallbacks are woven from each product's own `colors[]`.** The catalog
describes a saree as a body colour plus a border (`['Green', 'Yellow Border']`),
which maps straight onto cloth plus kaath. No photography exists yet; the
fallback is that specific saree in its own colours, not a generic gradient.
`swatch.ts` resolves the catalog's colour vocabulary, longest-match first, so
"Navy Blue" never collapses to "blue" and "Gold Asawali Border" finds the gold.

**Motion is spent once.** Only the guardrail overshoot animates on arrival.
Operate surfaces get no page-load choreography.

**Icons are authored SVG**, 24×24, 1.5 stroke, round caps, `currentColor`.
The set is hand-drawn on one grid — extend it rather than adding an icon
library, so stroke weight stays consistent across the product. Never
substitute an emoji for an icon.

**Loading is not disabled.** `.button:disabled:not([aria-busy="true"])` dims;
a button waiting on the agent keeps full saffron and shows a spinner.

**Tone is carried by the woven band and the hairline** — never by a thick
coloured bar down one side.

**Cloth belongs on panels, not in wells.** Inputs are sunken and carry no
weave; horizontal weft on a short field reads as banding.

## Browser surfaces

Themed, not left to the browser: `::selection` (saffron), `caret-color`
(saffron), scrollbars (WebKit + Firefox), `:focus-visible` ring
(`--focus-ring`), `::placeholder`, underline offset on inline links.

> [!IMPORTANT]
> **The focus-ring cascade trap.** `:focus-visible` in `globals.css` has the
> same specificity (0,1,0) as a CSS-module class, and modules are injected
> *after* globals — so any component that declares its own `box-shadow`
> silently swallows the ring. This shipped broken on `Button` (primary and
> secondary had no visible focus) until it was measured in a browser.
>
> **Any component with its own `box-shadow` must redeclare the ring itself:**
> ```css
> .thing:focus-visible { box-shadow: var(--focus-ring); }
> ```
> `.thing:focus-visible` is (0,2,0) and wins. Do not assume the global rule
> applies — verify computed `box-shadow` in the browser.
>
> Also: the global rule sets **no `border-radius`**. Forcing one there would
> square off the round send button on keyboard focus.

## Verified

Desktop 1440 and mobile 375 (`.impeccable/review/`). No horizontal overflow at
either width. Zero console or page errors. Enter sends · Shift+Enter newlines ·
empty Enter does nothing · field locks while the agent composes · IME
composition is never interrupted mid-cluster. Modal reports `aria-modal`, is
labelled, moves focus inside, closes on Escape. Impeccable detector: 0 findings.

**Keyboard focus measured in-browser (not assumed):** all six button variants
— primary, secondary, ghost, round send, modal close, modal primary — show the
saffron ring and keep their own corner radius. The composer does not steal
focus on mount.

## The landing page — a second surface, one world

`/` is **Persuade**; everything else is Operate. Same cloth, same zari, same
saffron rule — turned up rather than swapped out. Seed `185ba334`, form
**The Bolt of Cloth**, dealt by the structure roll and locked over two
alternates.

**The page is one saree unrolled.** A single zari *kaath* runs the full left
edge, floor to ceiling — one grid element spanning every row, so it is
genuinely continuous rather than a border repeated per section. That is the
difference between cloth and cards, and it is what the page is recognisable by
with every word removed.

**Where the guardrail sits, the kaath thickens** and turns amber, reaching back
into the spine. A kaath reinforces a saree exactly where it would otherwise
unravel; this page raises its voice in one place, on the material rather than
on the type.

**The hero demonstrates rather than claims.** A replay of a real session runs
beside the headline and ends on the ₹8,999 block — the same proportional-bar
device the chat ships, at hero scale. It is labelled *"replay of a real
session"*: a replay dressed as a live socket is the same lie as claiming a
feature that is not built.

Two composition facts learned in review:

- **Persuade needs the action in the first viewport.** Single-column put the
  CTA below the fold and left half of a 1440 viewport empty. Two columns from
  1000px — argument left, proof right — fixed both at once.
- **A grid gap and a child margin do not add up to spacing, they add up to a
  hole.** Let the container own it.

## Two rules that keep catching people

**One committing action per view.** Saffron marks the button that spends
money, and only that. A consent prompt therefore goes *spent* once the thread
moves past it — otherwise a stale "Haan" sits on screen beside a live "Pay
now", which both breaks the rule and re-sends consent if pressed.

**Chat bottom-anchors.** `margin-top: auto` on the thread. Top-anchored, the
empty state is a welcome bubble with several hundred pixels of void beneath it.

## Open

- No product photography exists. `ProductCard` degrades to the woven fallback
  above, so the demo is complete without it — real photos simply sit on top.
- `/` is a temporary design-system specimen sheet. **Step 9 replaces it**
  with the landing page. Consider moving the specimen to `/design` rather than
  deleting it — a browsable gallery of the real components, free.
- Dashboard and voice surfaces are not built yet and inherit this system
  rather than introducing a new one.
