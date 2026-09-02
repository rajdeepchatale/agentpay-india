"use client";

/* Design-system specimen sheet. Lives at /design.
   Every token, primitive, and state, rendered from the real components — so
   the system can be verified in a browser rather than asserted. This is where
   the focus-ring cascade trap was caught in Step 1.2, and it stays useful
   permanently: a browsable gallery that cannot drift out of sync, because it
   imports the actual code rather than copies of it.
   `/` redirects to /chat until Step 9 puts the landing page there. */

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, ShieldIcon } from "@/components/ui/Icon";
import { ChatInput } from "@/components/chat/ChatInput";
import styles from "./page.module.css";

export default function DesignSystemPage() {
  const [sent, setSent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limit, setLimit] = useState(1000);
  const [draftLimit, setDraftLimit] = useState("1000");

  const handleSend = (message: string) => {
    setSent((prev) => [...prev, message]);
    /* Stands in for the agent round-trip so the disabled and spinner states
       can be seen. Real wiring lands in Step 6. */
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1400);
  };

  const saveLimit = () => {
    const next = Number(draftLimit);
    if (Number.isFinite(next) && next > 0) setLimit(next);
    setLimitOpen(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <main className={styles.inner}>
          <header className={styles.masthead}>
            <h1 className={styles.wordmark}>AgentPay India</h1>
            <div className={styles.mastheadMeta}>
              <Badge tone="zari">Woven / zari</Badge>
              <Badge tone="neutral" mono>
                seed a527c7f3
              </Badge>
              <Badge tone="accent">Step 2 — design system</Badge>
            </div>
            <p className={styles.lede}>
              Surfaces are cloth, not glass. Hairlines are zari — the gold
              thread woven into a Paithani border. Saffron is spent only on the
              action that commits money.
            </p>
          </header>

          {/* ---------------- Materials ---------------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Materials</h2>
            <div className={styles.swatchGrid}>
              <div className={styles.swatch}>
                <div className={`${styles.swatchBody} ${styles.swatchGround}`} />
                <div className={styles.swatchCaption}>
                  <b>Ground</b>
                  <code>--bg-primary #0a0a0f</code>
                </div>
              </div>

              <div className={styles.swatch}>
                <div className={`${styles.swatchBody} ${styles.swatchCloth}`} />
                <div className={styles.swatchCaption}>
                  <b>Cloth</b>
                  <code>warp + weft, crossing</code>
                </div>
              </div>

              <div className={styles.swatch}>
                <div className={`${styles.swatchBody} ${styles.swatchZari}`}>
                  <div className={styles.threadLine} />
                  <div className={styles.threadLine} />
                  <div className={styles.threadLine} />
                </div>
                <div className={styles.swatchCaption}>
                  <b>Zari</b>
                  <code>bright where it catches light</code>
                </div>
              </div>

              <div className={styles.swatch}>
                <div className={`${styles.swatchBody} ${styles.swatchSaffron}`} />
                <div className={styles.swatchCaption}>
                  <b>Saffron</b>
                  <code>--accent-primary #f97316</code>
                </div>
              </div>
            </div>
            <p className={styles.note}>
              Gold is a material and saffron is a decision. They never do each
              other&apos;s job — that separation is what keeps two warm hues from
              turning to mud.
            </p>
          </section>

          {/* ---------------- Type ---------------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Type</h2>

            <div className={styles.specimen}>
              <p className={styles.subLabel}>
                Display — Anek Devanagari, Ek Type, Mumbai
              </p>
              <p className={styles.specDisplay}>
                Making 60M Bharat merchants AI-transactable
              </p>
              <p className={styles.specDevanagari}>
                मला पैठणी साडी दाखवा
              </p>
            </div>

            <div className={styles.specimen}>
              <p className={styles.subLabel}>UI and body — Mukta</p>
              <p className={styles.specDisplay} style={{ fontFamily: "var(--font-ui)" }}>
                Handloom Cotton Saree — Mango Motif
              </p>
              <p className={styles.specDevanagari} style={{ fontFamily: "var(--font-ui)" }}>
                हातमाग कॉटन साडी — आंबा मोटिफ
              </p>
              <p className={styles.specBody}>
                Soft handloom cotton with a traditional mango border. Lightweight
                and breathable — made for Pune summers.
              </p>
            </div>

            <div className={styles.specimen}>
              <p className={styles.subLabel}>
                One type system, no seam where the script changes
              </p>
              <p className={styles.mixed}>
                cotton साडी dikhao ₹1000 ke under — मोर पदर आहे का?
              </p>
            </div>

            <div className={styles.specimen}>
              <p className={styles.subLabel}>Mono — JetBrains Mono, tabular</p>
              <p className={styles.specMono}>order_PthN4kSaR1 · ₹599 · ₹24,999</p>
            </div>
          </section>

          {/* ---------------- Buttons ---------------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Actions</h2>

            <div className={styles.stack}>
              <div>
                <p className={styles.subLabel}>
                  Primary — reserved for the action that spends
                </p>
                <div className={styles.row}>
                  <Button variant="primary" size="sm">
                    Haan
                  </Button>
                  <Button variant="primary" size="md">
                    Confirm order
                  </Button>
                  <Button variant="primary" size="lg">
                    Pay ₹599
                  </Button>
                  <Button variant="primary" loading>
                    Creating order
                  </Button>
                  <Button variant="primary" disabled>
                    Disabled
                  </Button>
                </div>
              </div>

              <div>
                <p className={styles.subLabel}>Secondary — cloth under zari</p>
                <div className={styles.row}>
                  <Button size="sm">Nahi</Button>
                  <Button size="md">View audit trail</Button>
                  <Button size="lg">Show more sarees</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <p className={styles.subLabel}>Ghost — takes no dye until touched</p>
                <div className={styles.row}>
                  <Button variant="ghost" size="sm">
                    Cancel
                  </Button>
                  <Button variant="ghost" size="md">
                    Back to chat
                  </Button>
                  <Button variant="ghost" iconOnly round aria-label="Settings">
                    <ShieldIcon size={18} />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- Badges ---------------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Status</h2>
            <div className={styles.row}>
              <Badge tone="zari">Sakhi Sarees, Pune</Badge>
              <Badge tone="success" icon={<CheckIcon size={13} />}>
                Order created
              </Badge>
              <Badge tone="warning">Guardrail blocked</Badge>
              <Badge tone="handled">Recovered</Badge>
              <Badge tone="error">Failed</Badge>
              <Badge tone="info">Searched catalog</Badge>
              <Badge tone="neutral">Free Size</Badge>
              <Badge tone="neutral" mono>
                order_PthN4kSaR1
              </Badge>
            </div>
          </section>

          {/* ---------------- Cards ---------------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Panels</h2>
            <div className={styles.grid}>
              <Card band interactive>
                <p className={styles.cardTitle}>Handloom Cotton Saree</p>
                <p className={styles.cardHindi}>हातमाग कॉटन साडी</p>
                <div className={styles.cardFoot}>
                  <span className={styles.price}>₹599</span>
                  <Badge tone="neutral">Free Size</Badge>
                </div>
              </Card>

              <Card tone="success" band>
                <p className={styles.cardTitle}>Order created</p>
                <p className={styles.cardHindi}>
                  Aapka order place ho gaya hai.
                </p>
                <div className={styles.cardFoot}>
                  <span className={styles.price}>₹599</span>
                  <Badge tone="success" mono>
                    order_PthN4kSaR1
                  </Badge>
                </div>
              </Card>

              <Card tone="warning" band>
                <p className={styles.cardTitle}>Over your limit</p>
                <p className={styles.cardHindi}>
                  Paithani silk ₹8,999 se shuru hoti hain.
                </p>
                <div className={styles.cardFoot}>
                  <span className={styles.price}>₹8,999</span>
                  <Badge tone="warning">Limit ₹1,000</Badge>
                </div>
              </Card>

              <Card tone="handled" band>
                <p className={styles.cardTitle}>Out of stock</p>
                <p className={styles.cardHindi}>
                  Nauvari restocking next week — alternatives below.
                </p>
              </Card>

              <Card tone="error" band>
                <p className={styles.cardTitle}>Connection lost</p>
                <p className={styles.cardHindi}>
                  Check your internet and try again.
                </p>
              </Card>

              <Card tone="info" band>
                <p className={styles.cardTitle}>Searched catalog</p>
                <p className={styles.cardHindi}>
                  q=cotton · max_price=1000 · 7 results
                </p>
              </Card>
            </div>
          </section>

          {/* ---------------- Fields ---------------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Fields</h2>
            <div className={styles.grid}>
              <Input
                label="Spending limit"
                prefix="₹"
                type="number"
                defaultValue={1000}
                hint="The agent will not spend past this without asking."
              />
              <Input
                label="Spending limit"
                prefix="₹"
                defaultValue="0"
                error="Enter an amount above ₹0."
              />
              <Input label="Disabled" prefix="₹" defaultValue="1000" disabled />
            </div>
            <div className={styles.row} style={{ marginTop: "var(--space-6)" }}>
              <Button onClick={() => setLimitOpen(true)}>
                Open limit dialog
              </Button>
              <span className={styles.logEmpty}>
                Current limit: ₹{limit.toLocaleString("en-IN")}
              </span>
            </div>
          </section>

          {/* ---------------- Composer proof ---------------- */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Composer</h2>
            <p className={styles.note} style={{ marginTop: 0 }}>
              Enter sends. Shift+Enter adds a line. An empty field sends nothing,
              and the field locks while the agent is composing so a message
              cannot be sent twice. Try{" "}
              <span lang="mr">मला पैठणी साडी दाखवा</span>.
            </p>
            <div className={styles.log}>
              {sent.length === 0 ? (
                <p className={styles.logEmpty}>Nothing sent yet.</p>
              ) : (
                sent.map((message, index) => (
                  <p key={index} className={styles.logItem} lang="hi">
                    {message}
                  </p>
                ))
              )}
            </div>
          </section>
        </main>
      </div>

      <ChatInput
        onSend={handleSend}
        isLoading={loading}
        spendLimit={limit}
        onEditLimit={() => {
          setDraftLimit(String(limit));
          setLimitOpen(true);
        }}
      />

      <Modal
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        title="Spending limit"
        description="The agent blocks any order above this amount and suggests something within budget instead."
        footer={
          <>
            <Button variant="ghost" onClick={() => setLimitOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveLimit}>
              Save limit
            </Button>
          </>
        }
      >
        <Input
          label="Maximum spend"
          prefix="₹"
          type="number"
          min={1}
          value={draftLimit}
          onChange={(event) => setDraftLimit(event.target.value)}
          hint="Default is ₹1,000 — enough for the cotton and handloom range."
        />
      </Modal>
    </div>
  );
}
