import { useState, type FormEvent } from 'react';
import styles from './HealthEditDialog.module.css';

interface HealthEditDialogProps {
  /** Human-readable description of which coin this is, e.g. "Your minion 2". */
  label: string;
  currentHealth: number;
  onUpdate: (health: number) => void;
  onCancel: () => void;
}

export function HealthEditDialog({ label, currentHealth, onUpdate, onCancel }: HealthEditDialogProps) {
  const [value, setValue] = useState(String(currentHealth));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    onUpdate(Math.round(parsed));
  };

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <form className={styles.dialog} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <p className={styles.title}>{label} health</p>
        <input
          type="number"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.updateButton}>
            Update
          </button>
        </div>
      </form>
    </div>
  );
}
