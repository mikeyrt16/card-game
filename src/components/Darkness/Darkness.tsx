import type { PointerEvent as ReactPointerEvent } from 'react';
import smokeImage from '../../assets/smoke.png';
import styles from './Darkness.module.css';

interface DarknessProps {
  /** Screen position of its centre, already converted out of the shared map
   *  coordinates by the caller. */
  left: number;
  top: number;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

/** A patch of Spike's darkness sitting on the map. Slid about with pointer
 *  events, exactly as the coins are, by either player — once placed it's
 *  shared furniture. There's no removing it: Spike gets a fixed few (see
 *  SHADOW_TOKEN_LIMIT) and placing one commits it. */
export function Darkness({ left, top, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }: DarknessProps) {
  return (
    <div
      className={styles.darkness}
      style={{ left: `${left}px`, top: `${top}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role="img"
      aria-label="Shadow token"
    >
      <img src={smokeImage} alt="" className={styles.image} draggable={false} />
    </div>
  );
}
