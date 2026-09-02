import { products } from "@/lib/catalog/data";
import { SareeThumb } from "@/components/ui/SareeThumb";
import styles from "./CatalogStrip.module.css";

/**
 * The shop, on the shop's landing page.
 *
 * The hero replay shows sarees, but only during one beat of a loop — a visitor
 * arriving at the wrong moment saw a saree boutique with no sarees on it. This
 * band is always there.
 *
 * It reads the real catalog rather than a curated copy, so prices and
 * Devanagari names cannot drift from what the agent actually sells, and any
 * saree still missing a photograph shows its woven cloth instead of a gap.
 */
export function CatalogStrip() {
  return (
    <section className={styles.strip} aria-label="The catalog">
      <div className={styles.lead}>
        <h2 className={styles.head}>Sixteen sarees, ₹499 to ₹24,999</h2>
        <p className={styles.body}>
          Paithani from the Yeola and Paithan weavers, handloom cottons, Chanderi
          and Kanjivaram silks. The agent searches this catalog and no other — and
          reads every price from it rather than from the model.
        </p>
      </div>

      <ul className={styles.rail}>
        {products.map((p) => (
          <li key={p.id} className={styles.item}>
            <SareeThumb product={p} className={styles.photo} />
            <p className={styles.name}>{p.name.split("—")[0].trim()}</p>
            <p className={styles.deva} lang="mr">
              {p.name_hindi.split("—")[0].trim()}
            </p>
            <p className={styles.price}>₹{p.price.toLocaleString("en-IN")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
