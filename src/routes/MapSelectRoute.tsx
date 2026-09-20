import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MAPS } from '../data/maps';
import { useGameConnection } from '../net/GameConnectionProvider';
import styles from './MapSelectRoute.module.css';

export function MapSelectRoute() {
  const navigate = useNavigate();
  const { state, send } = useGameConnection();

  // Phase is shared — once either player's continue click advances it,
  // this carries *both* clients into the game together.
  useEffect(() => {
    if (state?.phase === 'playing') {
      navigate('/game', { replace: true });
    }
  }, [state?.phase, navigate]);

  if (!state?.me.characterId) {
    return <Navigate to="/select" replace />;
  }

  if (state.phase === 'character-select') {
    return <Navigate to="/select" replace />;
  }

  // selectedMapId is shared/server-synced; null until either player has
  // explicitly picked one. Both clients fall back to the same MAPS[0]
  // independently in that case, so it still reads as "the first map is
  // auto-selected" without needing a round trip to agree on it.
  const selectedMap = MAPS.find((map) => map.id === state.selectedMapId) ?? MAPS[0];

  return (
    <div className={styles.screen}>
      <div className={styles.listPanel}>
        <h1 className={styles.title}>Choose a map</h1>
        <div className={styles.mapList}>
          {MAPS.map((map) => (
            <button
              key={map.id}
              type="button"
              className={
                map.id === selectedMap?.id ? `${styles.mapButton} ${styles.mapButtonSelected}` : styles.mapButton
              }
              onClick={() => send({ type: 'selectMap', mapId: map.id })}
            >
              {map.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.continueButton}
          disabled={!selectedMap}
          onClick={() => send({ type: 'continueToGame' })}
        >
          Continue
        </button>
      </div>
      <div className={styles.previewPanel}>
        {selectedMap && <img src={selectedMap.image} alt={selectedMap.name} className={styles.previewImage} />}
      </div>
    </div>
  );
}
