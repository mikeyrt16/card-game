import styles from './CharacterCardDialog.module.css';

interface CharacterCardDialogProps {
  image: string;
  characterName: string;
  onClose: () => void;
}

export function CharacterCardDialog({ image, characterName, onClose }: CharacterCardDialogProps) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <img src={image} alt={`${characterName} character card`} className={styles.image} draggable={false} />
      </div>
    </div>
  );
}
