import { type CardDefinition, borg, federation, klingons, romulan } from './cards';

export interface CharacterDef {
  id: string;
  name: string;
  cards: CardDefinition[];
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'klingons', name: 'Klingons', cards: klingons },
  { id: 'romulan', name: 'Romulan', cards: romulan },
  { id: 'borg', name: 'Borg', cards: borg },
  { id: 'federation', name: 'Federation', cards: federation },
];

export function getCharacterDef(id: string): CharacterDef | undefined {
  return CHARACTER_DEFS.find((character) => character.id === id);
}
