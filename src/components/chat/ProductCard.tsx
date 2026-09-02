"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { swatchFor } from "@/lib/chat/swatch";
import styles from "./ProductCard.module.css";

export interface ProductCardProps {
  product: Product;
  /** Sends "Mujhe {name} chahiye" as the buyer's next turn. */
  onSelect: (product: Product) => void;
  disabled?: boolean;
}

export function ProductCard({ product, onSelect, disabled = false }: ProductCardProps) {
  /* Every image_url in the catalog may 404 — the photography does not exist
     yet. Start optimistic, fall back on the first error, and never show a
     broken-image icon. */
  const [imageFailed, setImageFailed] = useState(false);
  const swatch = swatchFor(product);

  return (
    <article className={styles.card}>
      <div
        className={styles.figure}
        style={
          {
            "--swatch-body": swatch.body,
            "--swatch-selvedge": swatch.selvedge,
          } as React.CSSProperties
        }
      >
        {!imageFailed && (
          /* Plain <img>, deliberately. Every one of the sixteen files is
             currently missing, and this component's whole job is to degrade
             cleanly when that happens — a bare onError is the reliable signal.
             next/image routes through the optimizer, which turns each missing
             file into a noisy 400 before onError ever fires. Revisit once real
             photography exists. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.photo}
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}

        {/* The woven fallback sits underneath and is simply revealed. It is
            built from this saree's own colours, so it reads as cloth rather
            than as a missing asset. */}
        <span className={styles.cloth} aria-hidden="true">
          <span className={styles.initial}>{swatch.initial}</span>
          <span className={styles.kaath} />
        </span>

        {!product.in_stock && <span className={styles.sold}>Out of stock</span>}
      </div>

      <div className={styles.body}>
        <h4 className={styles.name}>{product.name}</h4>
        {/* Devanagari is not a subtitle here. Same size, same weight — the
            product's other name, not a translation of it. */}
        <p className={styles.nameDeva} lang="mr">
          {product.name_hindi}
        </p>

        <div className={styles.foot}>
          <span className={styles.price}>₹{product.price.toLocaleString("en-IN")}</span>
          <button
            type="button"
            className={styles.select}
            onClick={() => onSelect(product)}
            disabled={disabled || !product.in_stock}
          >
            Select
          </button>
        </div>
      </div>
    </article>
  );
}
