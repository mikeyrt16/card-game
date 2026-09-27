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
  onRemove: () => void;
}

/** A patch of Spike's darkness sitting on the map. Slid about with pointer
 *  events, exactly as the coins are, and double-clicked away. Either player
 *  can do both — once placed it's shared furniture. */
export function Darkness({ left, top, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onRemove }: DarknessProps) {
  return (
    <div
      className={styles.darkness}
      style={{ left: `${left}px`, top: `${top}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onRemove}
      role="img"
      aria-label="Patch of darkness — double-click to clear"
    >
      <img src={smokeImage} alt="" className={styles.image} draggable={false} />
    </div>
  );
}
