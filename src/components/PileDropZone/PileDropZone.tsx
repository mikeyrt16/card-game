import { useState } from 'react';
import styles from './PileDropZone.module.css';

export type PilePosition = 'top' | 'random' | 'bottom';

interface PileDropZoneProps {
  placement: 'draw' | 'discard';
  isDragActive: boolean;
  onDropCard: (cardId: string, position: PilePosition) => void;
}

const DROP_BANDS: { position: PilePosition; label: string }[] = [
  { position: 'top', label: 'Top' },
  { position: 'random', label: 'Random' },
  { position: 'bottom', label: 'Bottom' },
];

export function PileDropZone({ placement, isDragActive, onDropCard }: PileDropZoneProps) {
  const [hoverPosition, setHoverPosition] = useState<PilePosition | null>(null);

  if (!isDragActive) {
    return null;
  }

  const placementClass = placement === 'draw' ? styles.placementDraw : styles.placementDiscard;

  return (
    <div className={`${styles.dropZone} ${placementClass}`}>
      {DROP_BANDS.map(({ position, label }) => (
        <div
          key={position}
          className={hoverPosition === position ? `${styles.dropBand} ${styles.dropBandOver}` : styles.dropBand}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setHoverPosition(position)}
          onDragLeave={() => setHoverPosition((current) => (current === position ? null : current))}
          onDrop={(e) => {
            e.preventDefault();
            setHoverPosition(null);
            const cardId = e.dataTransfer.getData('text/plain');
            if (cardId) {
              onDropCard(cardId, position);
            }
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
