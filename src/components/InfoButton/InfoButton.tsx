import styles from './InfoButton.module.css';

interface InfoButtonProps {
  placement: 'player' | 'opponent';
  /** Which pile to sit next to — defaults to 'discard', but that pile
   *  renders nothing (and disappears) once empty, so callers should switch
   *  to 'draw' then rather than leaving this floating over empty space. */
  anchor?: 'discard' | 'draw';
  ariaLabel: string;
  onClick: () => void;
}

export function InfoButton({ placement, anchor = 'discard', ariaLabel, onClick }: InfoButtonProps) {
  const placementClass = {
    player: { discard: styles.placementPlayer, draw: styles.placementPlayerNearDraw },
    opponent: { discard: styles.placementOpponent, draw: styles.placementOpponentNearDraw },
  }[placement][anchor];

  return (
    <button
      type="button"
      className={`${styles.infoButton} ${placementClass}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      i
    </button>
  );
}
