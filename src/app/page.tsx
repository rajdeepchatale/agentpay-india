import { redirect } from "next/navigation";

/**
 * `/` sends every visitor straight into the product.
 *
 * TEMPORARY, and deliberate: the landing page is Step 9. Until it exists, the
 * most useful thing a judge can find at the root is the working chat, not a
 * parts catalogue of buttons and colour swatches. That specimen sheet still
 * exists at `/design` — it is how the design system gets verified in a
 * browser, and it is worth keeping after Step 9 replaces this file.
 */
export default function RootPage() {
  redirect("/chat");
}
