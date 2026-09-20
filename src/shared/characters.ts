import { type CardDefinition, medusa, sinbad, arthur, alice } from './cards';

export interface CharacterDef {
  id: string;
  name: string;
  cards: CardDefinition[];
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'arthur', name: 'Arthur', cards: arthur },
  { id: 'alice', name: 'Alice', cards: alice },
  { id: 'medusa', name: 'Medusa', cards: medusa },
  { id: 'sinbad', name: 'Sinbad', cards: sinbad },
];

export function getCharacterDef(id: string): CharacterDef | undefined {
  return CHARACTER_DEFS.find((character) => character.id === id);
}
