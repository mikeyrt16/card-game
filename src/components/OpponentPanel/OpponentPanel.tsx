import type { CardData } from '../../data/cards';
import styles from './OpponentPanel.module.css';

interface OpponentPanelProps {
  characterName: string | null;
  connected: boolean;
  cardBack: string;
  handCount: number;
  drawPileCount: number;
  discardPile: CardData[];
  playedCard: CardData | null;
}

/** Read-only status strip for the opponent's board — no interaction, just
 *  enough visibility to play against (hand stays hidden as a count only). */
export function OpponentPanel({
  characterName,
  connected,
  cardBack,
  handCount,
  drawPileCount,
  discardPile,
  playedCard,
}: OpponentPanelProps) {
  return (
    <div className={styles.panel}>
      <span className={styles.name}>
        {characterName ?? 'Opponent'}
        {!connected && <span className={styles.offline}> (offline)</span>}
      </span>
      <div className={styles.stat}>
        <img src={cardBack} alt="" className={styles.thumb} draggable={false} />
        <span>{handCount} in hand</span>
      </div>
      <div className={styles.stat}>
        <img src={cardBack} alt="" className={styles.thumb} draggable={false} />
        <span>{drawPileCount} in deck</span>
      </div>
      <div className={styles.stat}>
        {discardPile[0] ? (
          <img src={discardPile[0].image} alt="" className={styles.thumb} draggable={false} />
        ) : (
          <div className={styles.emptyThumb} />
        )}
        <span>{discardPile.length} discarded</span>
      </div>
      {playedCard && (
        <div className={styles.stat}>
          <img src={playedCard.image} alt="" className={styles.thumb} draggable={false} />
          <span>played</span>
        </div>
      )}
    </div>
  );
}
