import { getSpecialImage } from '../../data/assets';
import styles from './AliceCoin.module.css';

const SMALL_IMAGE = getSpecialImage('alice', 'small');
const BIG_IMAGE = getSpecialImage('alice', 'big');

interface AliceCoinProps {
  /** False for the opponent's mirrored copy (upside down, below their
   *  deck) — true for the Alice player's own (right-side up, above theirs). */
  mirrored: boolean;
  big: boolean;
  onToggle: () => void;
}

/** Alice's special component: a coin that starts small and flips to big (or
 *  back) on click, from either player. Shown above the Alice player's own
 *  deck and, mirrored upside down, below the opponent's — both are the same
 *  underlying state, so flipping one flips both. */
export function AliceCoin({ mirrored, big, onToggle }: AliceCoinProps) {
  return (
    <button
      type="button"
      className={mirrored ? `${styles.container} ${styles.mirrored}` : styles.container}
      onClick={onToggle}
      aria-label={`Alice's coin (currently ${big ? 'big' : 'small'}) — click to flip`}
    >
      <div className={big ? `${styles.flipInner} ${styles.flipped}` : styles.flipInner}>
        <img src={SMALL_IMAGE} alt="" className={`${styles.face} ${styles.faceFront}`} draggable={false} />
        <img src={BIG_IMAGE} alt="" className={`${styles.face} ${styles.faceBack}`} draggable={false} />
      </div>
    </button>
  );
}
