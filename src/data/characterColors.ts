/** Each character's signature color — drives their coin particle fountain,
 *  their coin's drag-glow, and anything else that should read as "themed to
 *  whichever character you picked" rather than a fixed app-wide accent.
 *  Falls back to the original gold if an unknown/no characterId is given. */
const CHARACTER_COLORS: Record<string, string> = {
  medusa: '#6FCF52',
  arthur: '#FF6F5E',
  alice: '#4FC3FF',
  sinbad: '#F7932D',
};
const DEFAULT_COLOR = '#FFD54A';

export function characterColorHex(characterId: string | null): string {
  return (characterId && CHARACTER_COLORS[characterId]) || DEFAULT_COLOR;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** A character's color as a space-separated "R G B" triple, for CSS's
 *  `rgb(var(--glow-rgb) / <alpha>)` syntax. */
export function characterGlowRgb(characterId: string | null): string {
  return hexToRgb(characterColorHex(characterId)).join(' ');
}
