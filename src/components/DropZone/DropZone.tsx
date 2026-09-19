import { useState } from 'react';
import type { CardData } from '../../data/cards';
import styles from './DropZone.module.css';

interface DropZoneProps {
  playedCard: CardData | null;
  isDragActive: boolean;
  onDropCard: (cardId: string) => void;
  onRemoveCard: () => void;
}

export function DropZone({ playedCard, isDragActive, onDropCard, onRemoveCard }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const showPlaceholder = !playedCard && (isDragActive || isOver);

  const classNames = [styles.dropZone];
  if (showPlaceholder) {
    classNames.push(styles.visible);
  }
  if (!playedCard && isOver) {
    classNames.push(styles.hovering);
  }

  return (
    <div
      className={classNames.join(' ')}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const cardId = e.dataTransfer.getData('text/plain');
        if (cardId) {
          onDropCard(cardId);
        }
      }}
    >
      {playedCard && (
        <div className={styles.playedCard}>
          <div className={styles.playedCardArt}>
            <img src={playedCard.image} alt="" className={styles.playedCardImage} draggable={false} />
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={onRemoveCard}
            aria-label="Return card to hand"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
