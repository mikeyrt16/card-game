import { useNavigate } from 'react-router-dom';
import { CHARACTERS } from '../data/characters';
import styles from './CharacterSelectRoute.module.css';

export function CharacterSelectRoute() {
  const navigate = useNavigate();

  return (
    <div className={styles.board}>
      <h1 className={styles.title}>Choose your character</h1>
      <div className={styles.grid}>
        {CHARACTERS.map((character) => (
          <button
            key={character.id}
            type="button"
            className={styles.card}
            onClick={() => navigate(`/game/${character.id}`)}
          >
            <img src={character.portrait} alt="" className={styles.portrait} draggable={false} />
            <span className={styles.name}>{character.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
