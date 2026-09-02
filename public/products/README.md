# Saree images — generation brief

**Save every file directly in this folder** (`public/products/`). They are served
at `/products/<filename>`, which is exactly what `src/lib/catalog/data.ts`
already expects. **Do not edit any code.** Do not rename anything. Filenames are
the contract — one typo is one missing image.

**Every saree is worn by a model.** There are no product-only or flat-lay shots.
One consistent treatment across all 16.

| Group | Files | Status |
|---|---|---|
| **A** — everyday cottons, ₹499–₹949 | 7 | ✅ **DONE** — generated and verified |
| **B** — premium silks, ₹1,299–₹24,999 | 9 | ⬜ **REMAINING** |

> [!NOTE]
> **Group A is finished and the demo is visually complete.** All seven exist at
> 800 × 1067, under 200 KB, confirmed correct by `verify-images.mjs` and by eye.
> Those are the only images the scripted demo displays — see
> [§7](#7-where-these-actually-appear).
>
> **9 files remain, all in Group B.** Paste-ready prompts are directly below.

---

## READY TO PASTE — the 9 remaining prompts

Each block is a **complete prompt**. Paste one, generate, save under the
filename above it, then move to the next. **Do not batch** — see
[§8](#8-how-to-save-these-without-crossing-them-over).

All are **3:4 portrait, 800 × 1067, under 200 KB**, saved in this folder.

**Negative prompt for every one:**

```
text, watermark, logo, price tag, extra limbs, deformed hands, blurry, collage, multiple people, dark background, harsh shadows, colour gels, mannequin, hanger
```

---

**`nauvari-saree.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 30 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail and visible weave texture. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Green cotton-silk nauvari saree with a red border, draped in the traditional 9-yard Maharashtrian kashta style — tucked between the legs like a dhoti, not the standard 6-yard drape.
```

**`gadwal-silk.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 28 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail and visible weave texture. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Blue Gadwal handloom saree with a maroon kuttu border. Lightweight silk body with a heavier contrasting cotton border.
```

**`tussar-silk-keri.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 32 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail and visible weave texture. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Natural golden tussar silk saree with a brown keri (paisley) border. Earthy raw-silk sheen and slubbed texture.
```

**`banarasi-silk-blend.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 27 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail, visible weave texture and metallic gold thread sheen. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Rich red Banarasi silk-blend saree with dense gold zari buti work — small motifs scattered across the body — and an ornate heavy pallu. Wedding-grade, lustrous.
```

**`kanjivaram-temple.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 33 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail, visible weave texture and metallic gold thread sheen. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Wine-coloured Kanjivaram silk saree with a broad gold temple border — a row of triangular points like temple spires — and a contrast pallu. Heavy lustrous South Indian silk.
```

**`paithani-peacock.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 30 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail, visible weave texture and metallic gold thread sheen. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Emerald green pure-silk Paithani saree with a hand-woven gold peacock (mor) pallu draped over the shoulder. Luxurious jewel-toned silk, real zari sheen.
```

**`yeola-paithani-asawali.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 34 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail, visible weave texture and metallic gold thread sheen. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Deep red Yeola Paithani silk saree with a gold asawali border — a flowering vine pattern — woven in real zari. Heirloom quality.
```

**`paithani-bangdi-mor.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 32 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail, visible weave texture and metallic gold thread sheen. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Royal purple traditional Paithani silk saree with gold bangdi mor motifs — peacocks arranged inside circular bangle forms. Ceremonial, richly woven.
```

**`bridal-paithani-heavy-zari.jpg`**
```
Professional e-commerce catalogue photograph of an Indian woman aged about 26 modelling a saree. Three-quarter crop from mid-thigh upward, centred, front-facing with a slight turn so the draped pallu over her shoulder is clearly visible. The saree fills most of the frame. Plain warm light-grey studio seamless background. Soft diffused even studio lighting, no hard shadows. Natural makeup, minimal jewellery, calm neutral expression, dark hair in a low bun. Hands relaxed low at her sides. Plain tonal blouse. Sharp fabric detail, visible weave texture and metallic gold thread sheen. Vertical 3:4 portrait framing. No text, no watermark, no logo.

SAREE: Bridal red Paithani silk saree with heavy gold zari across the entire body and a full peacock pallu. The most opulent piece in the shop.
```

### After each batch

```bash
node public/products/verify-images.mjs
```

`ok` and `near` both pass. `SWAP` means a file is probably under the wrong name
— open it and look.

---

## 1. What you are making these for

**The product.** AgentPay India — an AI shopping assistant. A buyer chats in
Hindi, Marathi, Hinglish or English; the agent finds sarees, enforces her
spending limit, asks for consent, and creates a real payment link. These images
are the products she is shown inside that conversation.

**The shop.** "Sakhi Sarees," a boutique in Pune run by a woman entrepreneur who
sources authentic Paithani from the Yeola and Paithan weavers. It is a
**representative demo merchant, not a real client** — see Attribution.

**The buyer.** A woman in Delhi, Bangalore or Pune who saw a saree in a Reel and
wants it. She is on a phone, at night, in a chat window.

**The interface.** Near-black (`#0a0a0f`) with saffron and gold. This is exactly
why every image needs a **light** background — the pale studio grey makes each
card glow against the dark app. A dark or moody photograph disappears into it.

**The register.** Catalogue, not campaign. Shopfront photographs a real boutique
would take: calm, clear, honest about the cloth. Not editorial, not lifestyle,
not a fashion shoot.

---

## 2. Output specification

| | Value |
|---|---|
| Format | JPEG, `.jpg` extension (rename if your tool exports PNG/WebP) |
| Ratio | **3:4 portrait**, identical for all 16 |
| Size | **800 × 1067 px** (or generate 1024 × 1365 and downscale) |
| Weight | **Under 200 KB each**, quality ~80 |
| Colour | sRGB |
| Forbidden | No text, watermark, logo, price tag, or border baked into the image |

The UI draws every label, price and frame itself. An image carrying its own text
will collide with the interface.

---

## 3. The rule that decides whether this looks real

**Consistency.** A catalogue where every shot is composed the same way reads as a
real business. Mismatched crops and backgrounds read as stock images pasted
together, and a viewer clocks that in about a second without knowing why.

Locked across **all 16**, no exceptions:

| | Fixed value |
|---|---|
| Treatment | **Model wearing the saree.** No flat-lays, no mannequins |
| Crop | Three-quarter, **from mid-thigh upward** |
| Background | Plain warm light-grey studio seamless, approx `#ece7e0` |
| Lighting | Soft, diffused, even. No hard shadows, no gels, no vignette |

### Why the crop is mid-thigh and not full body

These render in a card **176 × 235 CSS pixels**. In a full-body shot the saree
occupies about 60 px of width — the weave, the zari border and the motifs all
disappear, and the frame is spent on legs and floor. A three-quarter crop puts
the cloth in the frame.

---

## 4. Model direction

**The saree is the subject. The model is how it is shown.** If a choice makes the
model more interesting and the saree less legible, it is the wrong choice.

**Who.** Indian women, **aged 20 to 35**. Each file names its own age — the
spread is deliberate, so the set reads as a real shop's customers rather than one
casting call. Vary skin tone, height and build naturally across the sixteen.

**The Paithani rule.** A genuine Paithani is a Maharashtrian wedding saree,
usually gifted at marriage and worn at ceremonies afterwards — it reads as **25
and above**, never on a college-age model. Every Paithani and ceremonial silk in
Group B is set at 26–34 for this reason. Only the lightest everyday cottons in
Group A go below 25.

**Pose.** Standing, weight even, front-facing with a slight turn so the pallu
over one shoulder is fully visible. Relaxed and still. No walking, no twirling,
no over-the-shoulder glance, no hand on hip.

**Hands.** Relaxed low at her sides or lightly holding the pallu. **Keep them low
in frame or out of it** — hands are where AI image generation fails most often,
and a card is too small to forgive a sixth finger. Regenerate rather than keep a
distorted hand.

**Face.** Calm, neutral, a soft closed-mouth smile at most. Looking at camera.

**Hair.** Simple and dark — low bun, plait, or loose. It must not fall across the
pallu and hide the border.

**Makeup and jewellery.** Natural makeup. Small studs, thin bangles, nothing
more. A statement necklace competes with the zari and wins, which is wrong.

**Drape.** Standard Indian drape, pleats at the front, pallu over the left
shoulder — **except `nauvari-saree.jpg`, which is the 9-yard Maharashtrian
kashta drape**, tucked between the legs like a dhoti.

**Blouse.** Plain, tonal, short-sleeved. It should recede. No prints, no
contrast, no cutwork.

**Feet and floor.** Not in frame.

---

## 5. Saree vocabulary

These words appear in the prompts. If your image model handles them unreliably,
keep the plain-English gloss alongside.

| Term | What it means |
|---|---|
| **Pallu** | The decorated loose end draped over the shoulder — usually the most ornate part, and it must be visible in every shot |
| **Zari** | Real gold- or silver-wrapped thread woven into the cloth. Metallic sheen, not flat yellow paint |
| **Border / kaath** | The woven band running the length of both edges, often contrasting with the body |
| **Buti** | Small motifs scattered across the body |
| **Mor** | Peacock motif |
| **Bangdi mor** | "Bangle-peacock" — peacocks inside a circular bangle form |
| **Asawali** | A flowering-vine border pattern |
| **Amba / keri** | Mango or paisley motif |
| **Temple border** | A row of triangular points along the border, like temple spires |
| **Nauvari / kashta** | The 9-yard Maharashtrian drape, tucked like a dhoti — not the standard 6-yard |
| **Handloom** | Hand-woven. Slightly irregular texture, matte, visible weave |
| **Ikat** | Pattern dyed into threads before weaving, giving soft blurred edges |

---

## 6. Group A — done

Generated and verified. Listed for reference only; do not regenerate.

| Save as | Price | Model | SAREE |
|---|---|---|---|
| `mul-cotton-checks.jpg` | ₹649 | early 20s | White mul cotton, fine green Maharashtrian checks |
| `khadi-block-saree.jpg` | ₹499 | mid-late 20s | Indigo and white khadi, hand block-printed geometric motifs |
| `paithani-print-cotton.jpg` | ₹899 | late 20s | Purple cotton, printed gold Paithani-style motifs |
| `ikat-cotton-double.jpg` | ₹949 | late 20s–early 30s | Navy and white double ikat, blurred-edge geometrics |
| `chanderi-peacock-saree.jpg` | ₹799 | early-mid 30s | Maroon Chanderi cotton-silk, gold zari peacock border |
| `cotton-mango-saree.jpg` | ₹599 | mid 30s | Green handloom cotton, yellow mango (amba) border |
| `mangalgiri-temple-border.jpg` | ₹749 | mid 30s | Yellow Mangalgiri cotton, maroon and gold temple border |

---

## 7. Where these actually appear

> [!NOTE]
> Verified against the built chat UI, not assumed.

A photograph renders in **exactly one component — `ProductCard`**, the cards in a
search-results row. Everywhere else the interface draws its own cloth:

| Moment on screen | What renders |
|---|---|
| Search results row | **The photograph** (falls back to woven cloth) |
| The ₹8,999 guardrail block | Saree name as text + small CSS swatches — no photo |
| Consent prompt | CSS swatch — no photo |
| Order confirmation | Order ID and amount — no photo |

Two consequences:

- **Group A is the only set the scripted demo shows.** The default spending cap
  is ₹1,000, which filters Group B out of every search. That is why Group A came
  first and why the demo is already complete.
- `paithani-peacock.jpg` — the ₹8,999 saree that triggers the guardrail — is
  **named in text and never displayed**. Generate it for the catalogue and for
  the landing page (Step 9), not for the demo.

---

## 8. How to save these without crossing them over

Generating nine images in a batch is exactly where a green cotton saree ends up
saved as `bridal-paithani-heavy-zari.jpg`. Nobody notices until it is on camera
beside the wrong price.

**1. One saree at a time. Never batch.**
Generate → save → verify → next. Do not generate nine images and then distribute
them across nine filenames. Index drift in that second loop is the single most
likely way this job goes wrong.

**2. Carry the filename with the prompt, not the position.**
Never rely on "the third image goes to the third name."

**3. Check each file the moment it is saved.**
Right colour, right weave, right border? If not, regenerate that one file before
moving on.

### The automatic check

```bash
node public/products/verify-images.mjs
```

It reads each saved image's actual dominant colour — sampling the lower frame
and ignoring washed-out background pixels — then asks which of the sixteen
catalogue colours it is nearest to.

```
  ok    chanderi-peacock-saree.jpg   expected maroon   reads as wine (own #2)
  LOOK  gadwal-silk.jpg              expected blue     reads as maroon
```

- **`ok`** — nothing to do. A different colour name here is normal: almost every
  saree is two-tone, so a blue body with a maroon border can read either way.
- **`LOOK`** — the file's own colour ranked near the bottom of all sixteen. Open
  it. It might still be fine, but this is where a genuine crossing shows up.

> [!WARNING]
> **This is a coarse net, not a proof, and it produces false alarms.**
> The threshold was set by measurement: deliberately swapping two files put
> their own colours at rank **#15 of 16**, while correct-but-awkward images — a
> golden tussar with a wide brown border, a blue Gadwal with a maroon one —
> landed at **#11** and **#4**. Those ranges overlap, so the script is tuned to
> catch a whole file under the wrong name and to stay quiet otherwise.
>
> **Looking at the images is the real check.** It has never been wrong; the
> script has, repeatedly. Use this to sweep, then trust your eyes.

### When a generation comes out wrong

Regenerate, do not retouch.

| Failure | Fix |
|---|---|
| Distorted or extra fingers | Re-run with hands lower in frame or out of it |
| Background drifted dark or coloured | Restate the seamless `#ece7e0` grey and "no vignette" |
| Saree too small in frame | Tighten the crop — mid-thigh up, not full body |
| Wrong drape on the nauvari | Restate "9-yard kashta, tucked like a dhoti" |

---

## 9. Verification before you finish

- [ ] All filenames match this document character for character
- [ ] Every file is 3:4 portrait, 800 × 1067, under 200 KB
- [ ] **Every saree is worn by a model** — no flat-lays, no mannequins
- [ ] Same three-quarter crop across all sixteen
- [ ] Background is the same warm light grey in all sixteen
- [ ] Model ages fall between 20 and 35, and every Paithani is 25+
- [ ] Hands checked on every image — regenerate distorted or extra fingers
- [ ] No text, watermark or logo anywhere
- [ ] Files are in `public/products/`, not a subfolder
- [ ] No code files were modified
- [ ] **`node public/products/verify-images.mjs` exits 0**

Check the result at `http://localhost:3000/chat` — search "cotton saree dikhao"
and the Group A images should appear in the row. To see Group B, open Settings
and raise the spending limit above ₹1,000 first.

---

## 10. If a file is missing

Nothing breaks. Each placeholder is woven from **that saree's own catalogue
colours**: the body from `colors[0]`, a kaath (selvedge band) from `colors[1]`. A
saree listed as `['Green', 'Yellow Border']` renders as green cloth with a yellow
woven border, warp-and-weft texture and all. It reads as designed, not as a hole.

Drop a real file in and it takes over automatically. **No code change** — the
filenames are already wired into `data.ts`.

## Attribution

These are AI-generated for a hackathon demo. **"Sakhi Sarees" is a
representative demo merchant, not a real client** — it must be described that way
in the README, the video, and anywhere else it appears. Do not present it as an
existing customer, and do not invent revenue, order volumes, reviews or
testimonials for it.
