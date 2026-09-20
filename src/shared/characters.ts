import { type CardDefinition, medusa, sinbad, arthur, alice } from './cards';

export interface CharacterDef {
  id: string;
  name: string;
  cards: CardDefinition[];
  /** How many minion coins this character plays with on the map. */
  minionCount: number;
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'arthur', name: 'Arthur', cards: arthur, minionCount: 1 },
  { id: 'alice', name: 'Alice', cards: alice, minionCount: 1 },
  { id: 'medusa', name: 'Medusa', cards: medusa, minionCount: 3 },
  { id: 'sinbad', name: 'Sinbad', cards: sinbad, minionCount: 1 },
];

export function getCharacterDef(id: string): CharacterDef | undefined {
  return CHARACTER_DEFS.find((character) => character.id === id);
}
