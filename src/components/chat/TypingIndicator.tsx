import styles from "./TypingIndicator.module.css";

/** Three dots on the agent's own surface, so the reply lands where the wait was. */
export function TypingIndicator() {
  return (
    <div className={styles.row}>
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className="visually-hidden" role="status">
          Sakhi is typing
        </span>
      </div>
    </div>
  );
}
