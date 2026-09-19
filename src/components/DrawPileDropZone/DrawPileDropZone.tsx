import { useState } from 'react';
import styles from './DrawPileDropZone.module.css';

export type DrawPilePosition = 'top' | 'random' | 'bottom';

interface DrawPileDropZoneProps {
  isDragActive: boolean;
  onDropCard: (cardId: string, position: DrawPilePosition) => void;
}

const DROP_BANDS: { position: DrawPilePosition; label: string }[] = [
  { position: 'top', label: 'Top' },
  { position: 'random', label: 'Random' },
  { position: 'bottom', label: 'Bottom' },
];

export function DrawPileDropZone({ isDragActive, onDropCard }: DrawPileDropZoneProps) {
  const [hoverPosition, setHoverPosition] = useState<DrawPilePosition | null>(null);

  if (!isDragActive) {
    return null;
  }

  return (
    <div className={styles.dropZone}>
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
