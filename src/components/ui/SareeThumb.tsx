"use client";

import { useState } from "react";
import { swatchFor, type SwatchInput } from "@/lib/chat/swatch";
import styles from "./SareeThumb.module.css";

export interface SareeThumbProps {
  product: SwatchInput & { image_url?: string };
  /** Rendered size. Rows want `sm`; a consent prompt wants `md`. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * A saree at small scale: the photograph when there is one, the woven cloth
 * when there is not.
 *
 * Extracted because four surfaces need the same two-layer behaviour — the
 * guardrail alternatives, the consent prompt, the landing replay and the
 * catalog strip — and a photo-with-fallback repeated four times is four places
 * for it to drift. `ProductCard` keeps its own copy: it is a different
 * composition with a kaath band and an initial, not a scaled-down version of
 * this.
 */
export function SareeThumb({ product, size = "sm", className }: SareeThumbProps) {
  const [failed, setFailed] = useState(false);
  const swatch = swatchFor(product);

  return (
    <span
      className={`${styles.thumb} ${styles[size]} ${className ?? ""}`}
      style={
        {
          "--swatch-body": swatch.body,
          "--swatch-selvedge": swatch.selvedge,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {product.image_url && !failed && (
        /* Plain <img>: the whole job here is degrading cleanly when a file is
           absent, and a bare onError is the reliable signal for that. See
           ProductCard for the same reasoning. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.photo}
          src={product.image_url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
