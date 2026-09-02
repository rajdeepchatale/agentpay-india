/* ==========================================================================
   DIRECTION CONTRACT — AgentPay India  (seed a527c7f3 · mode: operate)

   THESIS: A payment agent for a saree merchant should be made of cloth, not
   glass. It refuses the frosted-card dark dashboard every AI commerce demo
   ships this year.

   OWN-WORLD: Near-black ground (#0a0a0f) carrying a real warp-and-weft weave.
   Hairlines are zari — gold thread that brightens where it catches light.
   Saffron (#f97316) is spent only on the action that commits money. Type is
   Ek Type of Mumbai: Anek Devanagari for display, Mukta for UI, both native in
   Devanagari and Latin so "cotton साडी dikhao" has no seam. JetBrains Mono
   holds order IDs.

   STORY: A buyer types in her own language and is answered in it. The agent
   finds the saree, and the moment it declines to overspend reads as protection
   she is glad to have.

   FIRST VIEWPORT: Full-bleed chat on cloth. The composer sits on a zari edge
   at the foot; the spending limit is stated beside it, always visible, never a
   modal. One saffron object on screen: send.

   FORM: Woven / zari — user-pinned, which beats the roll (assigned index 5).
   Raised by two directions it beat: state expresses through weave structure
   and relief, not colored badges alone (depot-blind); the accent is reserved
   for the committing action (creator-hardware bench).

   FINISH: unreviewed and undocumented is unfinished; this build ends with the
   finish review, the verdict, DESIGN.md, and every shipping raster carrying
   its provenance.
   ========================================================================== */

import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Mukta, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Display — Ek Type, Mumbai. Variable weight, Devanagari and Latin in one design. */
const anekDevanagari = Anek_Devanagari({
  variable: "--font-anek",
  subsets: ["latin", "devanagari"],
  display: "swap",
});

/* UI and body — Ek Type. Static cuts, so the weights are declared. */
const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

/* Order IDs, amounts, audit payloads. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-jb",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentPay India — Agentic Commerce for Bharat Merchants",
  description:
    "Chat in Hindi, Marathi, Hinglish or English. The agent finds the saree, respects your spending limit, asks before it spends, and creates a real Razorpay order.",
  applicationName: "AgentPay India",
  openGraph: {
    title: "AgentPay India",
    description:
      "Making 60 million Bharat merchants AI-transactable — in Hindi, Marathi, Hinglish and voice.",
    locale: "en_IN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  colorScheme: "dark",
};

/* The contract, greppable in the production build. */
const CONTRACT_MARK =
  "<!-- agentpay:direction woven-zari seed:a527c7f3 mode:operate -->";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anekDevanagari.variable} ${mukta.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT_MARK }} />
        {children}
      </body>
    </html>
  );
}
