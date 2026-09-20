import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTERS } from '../data/characters';
import { useGameConnection } from '../net/GameConnectionProvider';
import styles from './CharacterSelectRoute.module.css';

export function CharacterSelectRoute() {
  const navigate = useNavigate();
  const { state, error, send } = useGameConnection();

  // Phase is shared, not per-player — once either player's continue click
  // advances it, this effect carries *both* clients forward together.
  useEffect(() => {
    if (state?.phase === 'playing') {
      navigate('/game', { replace: true });
    } else if (state?.phase === 'map-select') {
      navigate('/maps', { replace: true });
    }
  }, [state?.phase, navigate]);

  const selectedCharacterId = state?.me.characterId ?? null;
  const opponentCharacterId = state?.opponent?.characterId ?? null;
  const canContinue = Boolean(selectedCharacterId && opponentCharacterId);

  return (
    <div className={styles.board}>
      <h1 className={styles.title}>Choose your character</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.grid}>
        {CHARACTERS.map((character) => {
          const isMine = character.id === selectedCharacterId;
          // Taken by the opponent — shown glowing so it's clear it's
          // spoken for, and disabled so this player can't also pick it.
          const isOpponents = character.id === opponentCharacterId;
          const cardClassName = [styles.card, isOpponents && styles.opponentSelected, isMine && styles.selected]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={character.id}
              type="button"
              className={cardClassName}
              disabled={isOpponents}
              onClick={() => send({ type: 'selectCharacter', characterId: character.id })}
            >
              <img src={character.portrait} alt="" className={styles.portrait} draggable={false} />
              <span className={styles.name}>{character.name}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.continueButton}
        disabled={!canContinue}
        onClick={() => send({ type: 'continueToMapSelect' })}
      >
        Continue
      </button>
    </div>
  );
}
