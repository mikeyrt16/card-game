import catDanceGif from '../../assets/cat-dance.gif';
import { CAT_DANCE_MS } from '../../shared/protocol';
import styles from './CatDance.module.css';

/** The dancing cat, centred over the whole game for `CAT_DANCE_MS` — shift + C
 *  from either player (see `startCatDance`), and both of them see it.
 *
 *  It takes itself back down: the animation ends hidden, so there's no timer
 *  here and no state to wind back. Mounting is what starts it, so the caller
 *  re-runs it by remounting under a new React key rather than telling it to. */
export function CatDance() {
  return (
    <div
      className={styles.overlay}
      // The one duration, shared with the server's retrigger gate, rather than
      // a 2s in the CSS that has to be remembered alongside it.
      style={{ animationDuration: `${CAT_DANCE_MS}ms` }}
      aria-hidden="true"
    >
      <img src={catDanceGif} alt="" className={styles.cat} draggable={false} />
    </div>
  );
}
