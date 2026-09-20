import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTERS } from '../data/characters';
import { useGameConnection } from '../net/GameConnectionProvider';
import styles from './CharacterSelectRoute.module.css';

export function CharacterSelectRoute() {
  const navigate = useNavigate();
  const { state, error, send } = useGameConnection();

  // Covers both a successful pick and a refresh mid-selection — either way,
  // once the server has us down as having a character, move to the board.
  useEffect(() => {
    if (state?.me.characterId) {
      navigate('/game', { replace: true });
    }
  }, [state?.me.characterId, navigate]);

  return (
    <div className={styles.board}>
      <h1 className={styles.title}>Choose your character</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.grid}>
        {CHARACTERS.map((character) => (
          <button
            key={character.id}
            type="button"
            className={styles.card}
            onClick={() => send({ type: 'selectCharacter', characterId: character.id })}
          >
            <img src={character.portrait} alt="" className={styles.portrait} draggable={false} />
            <span className={styles.name}>{character.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
