import { CHARACTER_DEFS } from '../shared/characters';
import { getCardBackImage, getCharacterPortrait } from './assets';

export interface Character {
  id: string;
  name: string;
  portrait: string;
  cardBack: string;
}

export const CHARACTERS: Character[] = CHARACTER_DEFS.map((def) => ({
  id: def.id,
  name: def.name,
  portrait: getCharacterPortrait(def.id),
  cardBack: getCardBackImage(def.id),
}));

export function getCharacter(id: string | undefined): Character | undefined {
  return CHARACTERS.find((character) => character.id === id);
}
