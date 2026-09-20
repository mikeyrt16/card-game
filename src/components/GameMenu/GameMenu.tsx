import { useState } from 'react';
import styles from './GameMenu.module.css';

interface GameMenuProps {
  onReturnToMainMenu: () => void;
}

/** Top-left hamburger button + dropdown-style menu dialog. Only one item
 *  for now — structured as a list so adding more later is trivial. */
export function GameMenu({ onReturnToMainMenu }: GameMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.menuButton} onClick={() => setIsOpen(true)} aria-label="Menu">
        <span className={styles.line} />
        <span className={styles.line} />
        <span className={styles.line} />
      </button>
      {isOpen && (
        <div className={styles.backdrop} onClick={() => setIsOpen(false)}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setIsOpen(false);
                onReturnToMainMenu();
              }}
            >
              Back to main menu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
