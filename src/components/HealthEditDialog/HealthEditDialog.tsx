import { useState, type FormEvent } from 'react';
import { playButtonClickSound } from '../../audio/sounds';
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

  // What would actually be submitted — null while the field holds nothing
  // usable (empty, or mid-typing something like "-"). Rounded here as well as
  // on submit so "5.4" reads as the same 5 the comparison below is made
  // against, rather than looking like a change that then does nothing.
  const parsed = Number(value);
  const nextHealth = value.trim() !== '' && Number.isFinite(parsed) ? Math.round(parsed) : null;
  // Nothing to submit until it's actually a different number: the health
  // change is what decides whether both players hear a heal or a hit, so an
  // update to the value it already had would be a sound over nothing.
  const canUpdate = nextHealth !== null && nextHealth !== currentHealth;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canUpdate) {
      return;
    }
    onUpdate(nextHealth);
  };

  // Backdrop click counts as a cancel too, so it goes through here rather than
  // straight to onCancel — dismissing it that way is the same action.
  const handleCancel = () => {
    playButtonClickSound();
    onCancel();
  };

  return (
    <div className={styles.backdrop} onClick={handleCancel}>
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
          <button type="button" className={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.updateButton} disabled={!canUpdate}>
            Update
          </button>
        </div>
      </form>
    </div>
  );
}
