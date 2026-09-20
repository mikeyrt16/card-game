import styles from './InfoButton.module.css';

interface InfoButtonProps {
  placement: 'player' | 'opponent';
  ariaLabel: string;
  onClick: () => void;
}

export function InfoButton({ placement, ariaLabel, onClick }: InfoButtonProps) {
  const placementClass = placement === 'player' ? styles.placementPlayer : styles.placementOpponent;

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
