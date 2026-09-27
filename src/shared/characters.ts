import { type CardDefinition, medusa, sinbad, arthur, alice, squirrelGirl, houdini, genie, buffy, angel, willow, spike } from './cards';

export interface CharacterDef {
  id: string;
  name: string;
  cards: CardDefinition[];
  /** How many minion coins this character plays with on the map. */
  minionCount: number;
  /** Starting health for this character's main coin. */
  mainHealth: number;
  /** Starting health for each of this character's minion coins. */
  minionHealth: number;
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'arthur', name: 'Arthur', cards: arthur, minionCount: 1, mainHealth: 18, minionHealth: 7 },
  { id: 'alice', name: 'Alice', cards: alice, minionCount: 1, mainHealth: 13, minionHealth: 8 },
  { id: 'medusa', name: 'Medusa', cards: medusa, minionCount: 3, mainHealth: 16, minionHealth: 1 },
  { id: 'sinbad', name: 'Sinbad', cards: sinbad, minionCount: 1, mainHealth: 15, minionHealth: 6 },
  { id: 'squirrelGirl', name: 'Squirrel Girl', cards: squirrelGirl, minionCount: 0, mainHealth: 13, minionHealth: 1 },
  { id: 'houdini', name: 'Houdini', cards: houdini, minionCount: 1, mainHealth: 14, minionHealth: 5 },
  { id: 'genie', name: 'Genie', cards: genie, minionCount: 0, mainHealth: 16, minionHealth: 0 },
  { id: 'buffy', name: 'Buffy', cards: buffy, minionCount: 1, mainHealth: 14, minionHealth: 6 },
  { id: 'angel', name: 'Angel', cards: angel, minionCount: 1, mainHealth: 16, minionHealth: 8 },
  { id: 'willow', name: 'Willow', cards: willow, minionCount: 1, mainHealth: 14, minionHealth: 6 },
  { id: 'spike', name: 'Spike', cards: spike, minionCount: 1, mainHealth: 15, minionHealth: 7 },
];

export function getCharacterDef(id: string): CharacterDef | undefined {
  return CHARACTER_DEFS.find((character) => character.id === id);
}
