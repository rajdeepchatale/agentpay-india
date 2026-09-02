# Saree product images — drop them in this folder

Save the files **directly in this folder** (`public/products/`). They are then
served at `/products/<filename>` — exactly what `src/lib/catalog/data.ts`
already expects. Nothing else needs changing.

**Nothing is blocked on these.** Every missing file already renders as an
authored woven placeholder in that saree's own colours. If you are short on
time, jump to [Priority order](#priority-order) — **seven** files cover
everything the scripted demo can reach, not sixteen.

---

## Hard rules

**1. Filenames must match exactly.** Lowercase, hyphens, `.jpg`. One typo = one
missing image.

**2. Keep the `.jpg` extension** even if your generator exports PNG or WebP —
just rename the file. The paths live in `data.ts`, which belongs to the backend
agent, so matching the existing names avoids editing his file. Next.js still
auto-serves modern WebP/AVIF to browsers, so you lose no performance.

**3. Ratio: 3:4 portrait. Target 800 × 1067px.**
Generate at 3:4 (or 1024 × 1365 and downscale). If your tool only does 2:3,
that is fine — **but use the same ratio for all 16.** Consistency matters more
than the exact number.

**4. Under ~200KB each.** Sixteen images should total under ~2.5MB or the demo
feels sluggish on video. Compress at quality 80 before saving.

**5. No text, watermarks, logos, or price tags baked into the image.**
The UI draws all of that.

---

## The thing that actually makes it look real

Not resolution — **consistency of framing**. A catalog where every shot is
composed the same way reads as a real business. Mismatched crops and
backgrounds read as stock images pasted together, and a judge clocks that in
about a second even without knowing why.

Lock these across all 16 and vary **only the saree**:

| | Fixed value |
|---|---|
| Framing | Full body, standing, centred, head to below the feet |
| Angle | Front-facing, slight three-quarter turn so the pallu is visible |
| Background | Plain warm light-grey studio seamless (~`#ece7e0`) |
| Lighting | Soft, diffused, even — no hard shadows, no coloured gels |
| Model | Indian woman, natural makeup, minimal jewellery |
| Mood | Calm, catalogue-neutral — not editorial or dramatic |

A light background is deliberate: the app is near-black, so light product shots
become the bright focus of every card.

---

## Reusable prompt

Paste this **style block** into every generation, then swap only the last line.

```
Professional e-commerce catalogue photograph of an Indian woman modelling a
saree. Full body, standing, centred, front-facing with a slight three-quarter
turn so the draped pallu over her shoulder is clearly visible. Plain warm
light-grey studio seamless background. Soft diffused even studio lighting, no
hard shadows. Natural makeup, minimal jewellery, calm neutral expression.
Sharp fabric detail and visible weave texture. Vertical 3:4 portrait framing.
No text, no watermark, no logo.

SAREE: <insert from the table below>
```

Negative prompt (if your tool supports one):
`text, watermark, logo, price tag, extra limbs, deformed hands, blurry, collage, multiple people, dark background`

---

## The 16 sarees

| # | Save as | SAREE line to use |
|---|---|---|
| 1 | `cotton-mango-saree.jpg` | Soft green handloom cotton saree with a yellow woven border and traditional mango (amba) motifs. Everyday matte cotton, lightweight drape. |
| 2 | `chanderi-peacock-saree.jpg` | Maroon Chanderi cotton-silk saree, lightweight and semi-sheer, with an elegant gold zari peacock border. |
| 3 | `khadi-block-saree.jpg` | Indigo and white khadi cotton saree with hand block-printed geometric motifs, natural dye, matte handspun texture. |
| 4 | `mul-cotton-checks.jpg` | White mul cotton saree with fine green Maharashtrian check pattern. Very lightweight, soft fluid drape. |
| 5 | `paithani-print-cotton.jpg` | Purple cotton saree with printed gold Paithani-style motifs and a decorated pallu. Affordable printed cotton, not woven zari. |
| 6 | `mangalgiri-temple-border.jpg` | Yellow Mangalgiri handloom cotton saree with a maroon and gold temple-design border. Crisp, structured cotton that holds pleats. |
| 7 | `banarasi-silk-blend.jpg` | Rich red Banarasi silk-blend saree with dense gold zari buti work and an ornate heavy pallu. Wedding-grade, lustrous. |
| 8 | `tussar-silk-keri.jpg` | Natural golden tussar silk saree with a brown keri (paisley) border. Earthy raw-silk sheen and slubbed texture. |
| 9 | `kanjivaram-temple.jpg` | Wine-coloured Kanjivaram silk saree with a broad gold temple border and contrast pallu. Heavy lustrous South Indian silk. |
| 10 | `gadwal-silk.jpg` | Blue Gadwal handloom saree with a maroon kuttu border. Lightweight silk body with a heavier contrasting cotton border. |
| 11 | `paithani-peacock.jpg` | Emerald green pure-silk Paithani saree with a hand-woven gold peacock (mor) pallu. Luxurious, jewel-toned, real zari sheen. |
| 12 | `yeola-paithani-asawali.jpg` | Deep red Yeola Paithani silk saree with a gold asawali (flowering vine) border woven in real zari. Heirloom quality. |
| 13 | `paithani-bangdi-mor.jpg` | Royal purple traditional Paithani silk saree with gold bangdi mor (bangle-peacock) motifs. Ceremonial, richly woven. |
| 14 | `bridal-paithani-heavy-zari.jpg` | Bridal red Paithani silk saree with heavy gold zari across the entire body and a full peacock pallu. The most opulent piece. |
| 15 | `nauvari-saree.jpg` | Green cotton-silk nauvari saree with red border, draped in the traditional 9-yard Maharashtrian kashta style (dhoti-like, not the standard drape). |
| 16 | `ikat-cotton-double.jpg` | Navy blue and white double-ikat handwoven cotton saree with blurred-edge geometric patterns from tie-dyed threads. |

---

## Where these actually appear

> [!IMPORTANT]
> Checked against the built chat UI (Step 6), not assumed. An earlier version
> of this file guessed wrong, so the list below is the corrected one.

A photograph renders in **exactly one component — `ProductCard`**, the cards in
a search-results rail. Everywhere else the UI draws its own cloth:

| Moment on screen | What renders |
|---|---|
| Search results rail | **The photograph** (falls back to woven cloth) |
| The ₹8,999 guardrail block | Saree name as text + small CSS swatches — **no photo** |
| Consent prompt ("Haan, order karein") | CSS swatch — **no photo** |
| Order confirmation + Pay now | Order ID and amount — **no photo** |

So the three most important frames of the video contain **no product
photography at all**. In particular `paithani-peacock.jpg` (the ₹8,999 saree)
never renders — the block names it in text. Generate it for completeness, not
for the demo.

## Priority order

Photos only show for sarees that appear in a results rail, and the default
spending cap is ₹1,000 — so **these seven cover everything reachable in the
scripted demo**:

| Save as | Price |
|---|---|
| `khadi-block-saree.jpg` | ₹499 |
| `cotton-mango-saree.jpg` | ₹599 |
| `mul-cotton-checks.jpg` | ₹649 |
| `mangalgiri-temple-border.jpg` | ₹749 |
| `chanderi-peacock-saree.jpg` | ₹799 |
| `paithani-print-cotton.jpg` | ₹899 |
| `ikat-cotton-double.jpg` | ₹949 |

Do the first three before anything else — they are what a "cotton saree
dikhao" search returns.

The remaining nine only appear if someone raises the cap in Settings and
searches the premium tier. Worth having for the landing page (Step 9), where
real photography earns far more than it does in the chat.

## When they are actually due

**No build step is blocked on them.** Nothing waits.

- **Best:** before Step 9, so the landing page can be designed around real
  photographs rather than around their absence.
- **Real deadline:** before the video is recorded.

## Safe to add gradually

Missing images do **not** break anything, and this is not a graceful-failure
consolation — the fallback is authored, and it was reviewed in a browser.

Each placeholder is woven from **that saree's own catalog colours**: the body
from `colors[0]`, a kaath (selvedge band) from `colors[1]`. A saree listed as
`['Green', 'Yellow Border']` renders as green cloth with a yellow woven border,
warp-and-weft texture and all. It reads as designed, not as a hole.

Drop a real file in and it simply takes over — **no code change**, the
filenames are already wired into `data.ts`.

## Attribution

These are AI-generated for a hackathon demo. "Sakhi Sarees" is a representative
demo merchant, not a real client — keep it described that way in the README and
the video.
