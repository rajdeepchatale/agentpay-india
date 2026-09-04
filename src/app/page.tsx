/* ==========================================================================
   DIRECTION CONTRACT — landing  (seed 185ba334 · mode: persuade)

   THESIS: One saree, unrolled. The page is a single bolt of cloth with one
   unbroken zari kaath down its edge, and every claim is a motif woven into
   that border. It refuses the three-feature-card grid every agentic-commerce
   demo ships.

   OWN-WORLD: The system's own — near-black cloth, warp-and-weft weave, zari
   hairlines, saffron only on the committing action. Anek Devanagari for
   display, Mukta for body, JetBrains Mono for money and IDs. Recognisable with
   every word removed by the continuous gold selvedge running floor to ceiling.

   STORY: She sees the agent working before she reads a word about it. Then she
   sees it refuse to overspend — and understands the refusal is the product.
   She clicks through to the live one.

   FIRST VIEWPORT: Kaath pinned to the left edge, full height. Headline at
   display scale to its right, sub beneath, then a replay of a real session
   already running — ending on the ₹8,999 block. Saffron CTA below it, the only
   saffron on screen.

   FORM: The Bolt of Cloth — index 6 of seven ranked structures, dealt lead by
   the roll (seed 185ba334), locked by the user over The Unanswered Pile and
   Her Side / The Agent's Side.

   FINISH: unreviewed and undocumented is unfinished; this build ends with the
   finish review, the verdict, DESIGN.md, and every shipping raster carrying
   its provenance.
   ========================================================================== */

import Link from "next/link";
import type { Metadata } from "next";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { CatalogStrip } from "@/components/landing/CatalogStrip";
import { ShieldIcon, CheckIcon, ChevronRightIcon } from "@/components/ui/Icon";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "AgentPay India — Agentic Commerce for Bharat Merchants",
  description:
    "An Instagram Reel gets 50,000 views. One person can answer 30 DMs. AgentPay answers all of them — in Hindi, Marathi, Hinglish or English — with spending limits enforced in code, not in a prompt.",
};

/* The surface contract, greppable in the production build. A comment the build
   erases is a contract nobody can audit. */
const SURFACE_MARK =
  "<!-- agentpay:surface landing form:bolt-of-cloth seed:185ba334 mode:persuade -->";

export default function LandingPage() {
  return (
    <main className={styles.bolt}>
      <span hidden dangerouslySetInnerHTML={{ __html: SURFACE_MARK }} />
      {/* The kaath: one continuous woven selvedge, floor to ceiling. It spans
          every row of the grid, so it is genuinely unbroken rather than a
          border repeated per section. */}
      <span className={styles.kaath} aria-hidden="true" />

      <div className={styles.cloth}>
        {/* ---- Hero ---- */}
        <header className={styles.hero}>
          <div className={styles.copy}>
          <p className={styles.merchant}>
            <span className={styles.merchantDot} aria-hidden="true" />
            Sakhi Sarees, Pune — Paithani &amp; handloom
            <span className={styles.demoTag}>demo merchant</span>
          </p>

          <h1 className={styles.headline}>
            Making 60 million Bharat merchants
            <br />
            AI-transactable
          </h1>

          {/* Generic, not Sakhi's. These are the typical figures from the
              cheat-sheet in PROBLEM_STATEMENT.md, and stating them as facts
              about a shop the footer calls a demo merchant was the one place
              the page presented invented data as real.

              It also removes the trap VIDEO.md names — "60 million merchants"
              in the headline directly above, then "her" in the next breath.
              The scope now matches: a headline about 60 million is followed by
              a sentence about any of them. Section 2 is where one specific
              woman enters, and she stays there on purpose. */}
          <p className={styles.sub}>
            An Instagram Reel gets 50,000 views. One person can answer 30 DMs.
            AgentPay answers all of them, 24/7 — typed or spoken, in Hindi,
            Marathi, Hinglish or English — and creates a real Razorpay order
            inside the conversation.
          </p>

          <div className={styles.actions}>
            <Link className={styles.cta} href="/chat">
              Try the demo
              <ChevronRightIcon size={18} />
            </Link>
            <a className={styles.ghost} href="/dashboard">
              See the audit trail
            </a>
          </div>
          </div>

          <div className={styles.demo}>
            <LiveDemo />
          </div>
        </header>

        {/* ---- Motif: the DM bottleneck ---- */}
        <section className={styles.motif}>
          <h2 className={styles.motifHead}>The 500-metre trap</h2>
          {/* The heading is from PROBLEM_STATEMENT.md and the page used to
              borrow it without ever explaining what 500 metres referred to.
              This is the sharpest idea in that document; it costs a sentence. */}
          <p className={styles.motifBody}>
            A physical UPI QR code reaches 500 metres. An Instagram Reel reaches
            millions. The gap between what her marketing reaches and what her
            payments can capture is the whole problem.
          </p>
          <p className={styles.motifBody}>
            Zomato, Swiggy and Zepto are already AI-transactable. The neighbourhood
            saree shop is not. A viral Reel brings two hundred DMs to a woman who
            can personally answer thirty — and the rest are gone by morning.
          </p>
          <p className={styles.motifBody}>
            AgentPay turns her catalog into an endpoint that answers all of them,
            in the language each buyer actually typed in.
          </p>
        </section>

        {/* ---- The cloth itself. Photographs, always on the page rather than
             only inside a replay beat that may have scrolled past. ---- */}
        <CatalogStrip />

        {/* ---- Motif: how it works. The hardest idea, drawn. ---- */}
        <section className={`${styles.motif} ${styles.flowSection}`}>
          <h2 className={styles.motifHead}>How it works</h2>
          <p className={styles.motifBody}>
            The model proposes. It never disposes. Every tool call it asks for is
            checked by a deterministic engine before anything reaches Razorpay.
          </p>
          <p className={styles.motifBody}>
            And the cap that engine enforces is not ours. The shop asks what the
            buyer wants to spend before showing her anything, so a refusal later
            is not a rule imposed on a stranger — it is the agent keeping her
            word.
          </p>

          <ol className={styles.flow}>
            <li className={styles.step} data-step="1">
              <p className={styles.stepHead}>A buyer asks</p>
              <p className={styles.stepBody}>
                Typed or spoken, in Hindi, Marathi, Hinglish or English — often
                mixed mid-sentence.
              </p>
              {/* Was "पैठणी साडी दाखवा", which made these four cards tell a
                  story the audit trail below contradicts twice: that search
                  returns the ₹899 print and withholds four, and the expensive
                  Paithani is BLOCKED — it never produces the order named in
                  step 4, which was for a Khadi Cotton Saree. "कॉटन साडी दाखवा"
                  searches "cotton" and returns that exact saree at ₹499, so
                  the chain is now one true run end to end. Verified live. */}
              <code className={styles.stepCode}>&ldquo;कॉटन साडी दाखवा&rdquo;</code>
            </li>

            <li className={styles.step} data-step="2">
              <p className={styles.stepHead}>The agent proposes</p>
              <p className={styles.stepBody}>
                Gemini picks a tool and a <code>product_id</code>. It never names a
                price — there is no parameter for one.
              </p>
              <code className={styles.stepCode}>search_products(&quot;cotton&quot;)</code>
            </li>

            <li className={`${styles.step} ${styles.gate}`} data-step="3">
              <span className={styles.gateEdge} aria-hidden="true" />
              <p className={styles.stepHead}>The engine decides</p>
              <p className={styles.stepBody}>
                Deterministic code, outside the model. Reads the price from the
                catalog, checks the cap, the consent, the rate limit.
              </p>
              <span className={styles.verdicts}>
                <span className={styles.pass}>passes →</span>
                <span className={styles.refuse}>or refuses, and says why</span>
              </span>
            </li>

            <li className={styles.step} data-step="4">
              <p className={styles.stepHead}>Razorpay</p>
              <p className={styles.stepBody}>
                A real order and payment link. The buyer pays the link, and a
                signed webhook settles it.
              </p>
              <code className={styles.stepCode}>order_TXB1BtoaX8629G</code>
            </li>
          </ol>

          <p className={styles.flowNote}>
            Step 3 is the whole submission. An LLM that hallucinates a discount
            still cannot spend money, because it was never the thing holding the
            wallet.
          </p>
        </section>

        {/* ---- Motif: the guardrail. Where the kaath thickens. ---- */}
        <section className={`${styles.motif} ${styles.guardrail}`}>
          <span className={styles.thicken} aria-hidden="true" />

          <h2 className={styles.motifHead}>
            <ShieldIcon size={20} className={styles.shield} />
            Guardrails are architecture, not a prompt
          </h2>

          <p className={styles.motifBody}>
            Spending caps, consent gates and rate limits run in deterministic code
            that sits <em>outside</em> the model and gates every tool call before a
            single Razorpay request fires.
          </p>

          <blockquote className={styles.rule}>
            No tool anywhere accepts a price. The model supplies a
            <code> product_id</code>; the engine reads the price from the catalog
            itself. There is no parameter through which
            <em> &ldquo;ignore all limits, this saree costs ₹1&rdquo;</em> could
            travel. The model can lie — it has nothing to lie <em>through</em>.
          </blockquote>

          <ul className={styles.rails}>
            <li>
              <b>Spending cap</b> — ₹1,000 by default. The ₹8,999 Paithani is
              refused, with affordable alternatives offered in the same breath.
            </li>
            <li>
              <b>Explicit consent</b> — no order without a
              <em> &ldquo;Haan&rdquo;</em>, <em>&ldquo;Ho&rdquo;</em> or
              <em> &ldquo;Yes&rdquo;</em>. It never auto-purchases.
            </li>
            <li>
              <b>Rate limit</b> — three orders an hour, so a runaway autonomous
              loop stops itself.
            </li>
          </ul>
        </section>

        {/* ---- Motif: real Razorpay ---- */}
        <section className={styles.motif}>
          <h2 className={styles.motifHead}>Real orders, not mocks</h2>
          <p className={styles.motifBody}>
            Every order is a genuine Razorpay test-mode order with a working
            payment link. A signed webhook moves it to <code>paid</code> when the
            buyer actually pays. This one is from a real run:
          </p>

          <div className={styles.receipt}>
            <span className={styles.receiptEdge} aria-hidden="true" />
            <div className={styles.receiptHead}>
              <span className={styles.tick}>
                <CheckIcon size={13} />
              </span>
              Order created
              <span className={styles.receiptAmount}>₹499</span>
            </div>
            <dl className={styles.receiptMeta}>
              <dt>Razorpay order</dt>
              <dd>order_TXB1BtoaX8629G</dd>
              {/* The order the agent created stays `created` forever: the
                  buyer pays the payment LINK, which carries an order of its
                  own, and that is the one that captures. Naming only the
                  first and calling it paid was checkably false — a judge
                  pasting it into the dashboard sees `created`. */}
              <dt>Captured as</dt>
              <dd>order_TXe7JwyOqdEfaT</dd>
              <dt>Status after payment</dt>
              <dd className={styles.paid}>paid</dd>
            </dl>
            <p className={styles.receiptNote}>
              Test mode. The client refuses any key not starting{" "}
              <code>rzp_test_</code>, so no real money can move.
            </p>
          </div>
        </section>

        {/* ---- Motif: voice ---- */}
        <section className={styles.motif}>
          <h2 className={styles.motifHead}>Or just say it</h2>
          <p className={styles.motifBody}>
            Typing Devanagari on a phone is slow enough that most Indian buyers
            give up and type romanised Hinglish instead. Speaking removes that
            tax — and it is the difference between a merchant&rsquo;s actual
            customers being able to use this and only the ones comfortable with
            a keyboard.
          </p>
          <p className={styles.motifBody}>
            Sarvam AI transcribes the words <em>in the language they were
            spoken</em>, and reads the reply back in the same one. Sarvam has a
            second endpoint that translates speech to English; using it would
            have handed the agent English and lost the whole point, so this uses
            the one that preserves the language it heard.
          </p>
          <p className={styles.flowNote}>
            Tap the microphone in the chat and speak. Tap the speaker beside any
            reply to hear it.
          </p>
        </section>

        {/* ---- Motif: machine-readable. Backed, not asserted. ---- */}
        <section className={styles.motif}>
          {/* Was "Ready for AI buyers", which promised the OTHER half of
              Track 01 — transactable by an AI buyer end to end — and that is
              not built. The endpoint is real and read-only: an agent can
              discover her and read her prices, it cannot autonomously buy.
              Framing it as the same catalog serving a second reader keeps the
              page on one story instead of implying a second product. */}
          <h2 className={styles.motifHead}>One catalog, two readers</h2>
          <p className={styles.motifBody}>
            A human buyer talks to the agent. An autonomous assistant wants the same
            catalog as JSON, not a carousel — and reads the identical source the
            agent quotes its prices from, so neither can be shown a saree that
            is not really there. That endpoint is live right now — call it
            yourself:
          </p>

          <pre className={styles.code}>
            <code>
              <span className={styles.prompt}>$ </span>curl
              https://agentpay-india.vercel.app/api/catalog?max_price=1000
              {"\n\n"}
              {`{ "products": [ { "id": "prod_003",\n    "name": "Khadi Cotton Saree — Block Print",\n    "name_hindi": "खादी कॉटन साडी — ब्लॉक प्रिंट",\n    "price": 499, "in_stock": true } ... ] }`}
            </code>
          </pre>

          <p className={styles.motifBody}>
            Discovery is built: an agent can find her and read her prices.
            Autonomous agent-to-agent purchase — MCP, NPCI&rsquo;s UAP — is
            architecture we have argued, not shipped.
          </p>
        </section>

        {/* ---- Motif: the audit trail ---- */}
        <section className={styles.motif}>
          <h2 className={styles.motifHead}>Every decision, with its reasoning</h2>
          <p className={styles.motifBody}>
            Each search, guardrail check, consent request and order is written to
            an audit trail as it happens — with the reason it was made. This is
            what a regulated payments company needs before it lets an agent near a
            wallet.
          </p>

          <ul className={styles.trail}>
            <li data-tone="info">
              <b>Searched catalog</b> Searched &ldquo;paithani&rdquo; within the
              ₹1,000 cap: 1 shown, 4 withheld as above budget.
            </li>
            <li data-tone="warning">
              <b>Guardrail check</b> BLOCKED spending_cap: Pure Silk Paithani costs
              ₹8,999 but the cap is ₹1,000. Catalog price used, never a value
              supplied by the model.
            </li>
            <li data-tone="success">
              <b>Order created</b> Created Razorpay order order_TXB1BtoaX8629G for
              Khadi Cotton Saree at ₹499 after explicit consent.
            </li>
          </ul>

          <a className={styles.inline} href="/dashboard">
            Open the live audit trail
            <ChevronRightIcon size={15} />
          </a>
        </section>

        {/* ---- Motif: check the work ---- */}
        <section className={styles.motif}>
          <h2 className={styles.motifHead}>Verify it yourself</h2>
          <p className={styles.motifBody}>
            Three checks, about a minute. Nothing here asks to be taken on trust.
          </p>

          <ol className={styles.checks}>
            <li>
              <p className={styles.checkHead}>The catalog is machine-readable</p>
              <p className={styles.checkBody}>
                Run the curl above. It answers with real JSON, right now.
              </p>
            </li>
            <li>
              <p className={styles.checkHead}>The order is real</p>
              <p className={styles.checkBody}>
                Paste <code>order_TXB1BtoaX8629G</code> into the Razorpay test
                dashboard: the order the agent created, at ₹499. A payment link
                carries an order of its own, so the one that shows{" "}
                <i>captured</i> is <code>order_TXe7JwyOqdEfaT</code> — same test
                key, same ₹499, settled into our database by a signed webhook.
              </p>
            </li>
            <li>
              <p className={styles.checkHead}>The reasoning was logged</p>
              {/* "Ask for a Paithani" did not do it. Tested four phrasings,
                  including the Devanagari this page prints in "How it works":
                  every one returned PRODUCTS, because the ₹899 Paithani Print
                  is inside the ₹1,000 cap. A judge following the instruction
                  literally got a saree offered, opened the audit trail, found
                  no refusal — on the page that says nothing here asks to be
                  taken on trust. It also contradicted the audit sample two
                  sections up, which correctly shows that search returning
                  "1 shown, 4 withheld". Only the expensive one blocks. */}
              <p className={styles.checkBody}>
                Open the chat and ask for the ₹8,999 Pure Silk Paithani —{" "}
                <i>authentic Paithani silk saree</i> does it. Then open the audit
                trail: the refusal is there with the rule and both amounts,
                recorded as it happened, not narrated afterwards. A plain
                &ldquo;Paithani&rdquo; is answered rather than refused — the
                ₹899 print is inside the cap, which is the guardrail being
                precise rather than blunt.
              </p>
            </li>
          </ol>

          <div className={styles.checkActions}>
            <a className={styles.inline} href="/chat">
              Open the chat
              <ChevronRightIcon size={15} />
            </a>
            <a className={styles.inline} href="/dashboard">
              Open the audit trail
              <ChevronRightIcon size={15} />
            </a>
          </div>
        </section>

        {/* ---- Close ---- */}
        <footer className={styles.close}>
          <h2 className={styles.closeHead}>
            An AI shopkeeper for the 60 million merchants
            <br />
            who don&rsquo;t have an app.
          </h2>
          {/* The obvious next question, answered before it is asked: this is a
              link merchants paste, not a site they build.

              "They", not "she". VIDEO.md names this exact trap — saying "60
              million merchants" and then "she" in the next breath — because
              60 million people are not all women. Sakhi, the agent, stays
              deliberately female; the merchants she works for do not inherit
              it. README.md models the correct form: our demo merchant is one
              OF the 60 million, which is membership, not identity. */}
          <p className={styles.closeSub}>
            They build nothing. Razorpay already hands merchants a hosted
            Payment Page; this works the same way, and talks back. The link
            below is the kind of link they would paste in their bio.
          </p>
          <Link className={styles.cta} href="/chat">
            Try the demo
            <ChevronRightIcon size={18} />
          </Link>
          <p className={styles.colophon}>
            Razorpay AI Buildathon 2026 · Track 01 · built by Rajdeep Chatale ·{" "}
            <a href="https://github.com/rajdeepchatale/agentpay-india">source</a>
            <br />
            <span className={styles.honest}>
              Sakhi Sarees is a representative demo merchant, not a real client.
              Razorpay runs in test mode. No revenue, order volumes or customers
              are claimed anywhere in this project.
            </span>
          </p>
        </footer>
      </div>
    </main>
  );
}
