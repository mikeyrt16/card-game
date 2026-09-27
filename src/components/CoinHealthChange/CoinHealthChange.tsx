import styles from './CoinHealthChange.module.css';

interface CoinHealthChangeProps {
  /** How much the coin's health just changed by — negative for damage. */
  delta: number;
  /** Screen position of the coin's centre, the same point the coin itself is
   *  placed on; the number rises from just above it (see the CSS). */
  left: number;
  top: number;
}

/** The arcade-style number that floats up off a coin when its health is
 *  edited, green for a heal and red for damage. Purely decorative: it animates
 *  once on mount and ends invisible, so the caller doesn't have to take it back
 *  down again — it re-runs by being remounted under a new React key (see
 *  `CoinState.healthEditCount`) rather than by any state of its own. */
export function CoinHealthChange({ delta, left, top }: CoinHealthChangeProps) {
  const isHeal = delta > 0;

  return (
    <div
      className={isHeal ? `${styles.change} ${styles.heal}` : `${styles.change} ${styles.damage}`}
      style={{ left: `${left}px`, top: `${top}px` }}
      aria-hidden="true"
    >
      {/* A negative delta already carries its own minus sign. */}
      {isHeal ? `+${delta}` : delta}
    </div>
  );
}
