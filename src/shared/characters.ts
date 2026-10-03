import { type CardDefinition, medusa, sinbad, arthur, alice, squirrelGirl, houdini, genie, buffy, angel, willow, spike, yennenga, achilles, sunWukong, bloodyMary } from './cards';

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
  /** What a minion of theirs comes back on when its own player revives it
   *  (see `resurrectMinion`). Only set for the characters who can do that at
   *  all — Willow's resurrect and Yennenga's archers — and its absence is
   *  what tells the server everyone else's minions stay dead. Deliberately
   *  separate from `minionHealth`: coming back is meant to be a reprieve, not
   *  a reset to full. */
  minionReviveHealth?: number;
  /** How many minions this character can put on the board themselves, one per
   *  click of their own control (see `spawnMinion`) — Squirrel Girl's
   *  squirrels and Sun Wukong's clones. Its absence is what tells the server
   *  everyone else can't conjure minions at all. These characters have a
   *  `minionCount` of 0, since they start with none and spawn them instead,
   *  and each one spawned arrives on `minionHealth`. */
  spawnableMinionLimit?: number;
  /** What the main coin pays, in health, for each minion spawned — Sun Wukong
   *  tears his clones off himself. Absent for anyone who spawns them free. */
  minionSpawnSelfDamage?: number;
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'arthur', name: 'Arthur', cards: arthur, minionCount: 1, mainHealth: 18, minionHealth: 7 },
  { id: 'alice', name: 'Alice', cards: alice, minionCount: 1, mainHealth: 13, minionHealth: 8 },
  { id: 'medusa', name: 'Medusa', cards: medusa, minionCount: 3, mainHealth: 16, minionHealth: 1 },
  { id: 'sinbad', name: 'Sinbad', cards: sinbad, minionCount: 1, mainHealth: 15, minionHealth: 6 },
  // Her minions aren't pre-placed: she starts with none and spawns them one at
  // a time from her own button, free — see spawnableMinionLimit.
  { id: 'squirrelGirl', name: 'Squirrel Girl', cards: squirrelGirl, minionCount: 0, mainHealth: 13, minionHealth: 1, spawnableMinionLimit: 8 },
  { id: 'houdini', name: 'Houdini', cards: houdini, minionCount: 1, mainHealth: 14, minionHealth: 5 },
  { id: 'genie', name: 'Genie', cards: genie, minionCount: 0, mainHealth: 16, minionHealth: 0 },
  { id: 'buffy', name: 'Buffy', cards: buffy, minionCount: 1, mainHealth: 14, minionHealth: 6 },
  { id: 'angel', name: 'Angel', cards: angel, minionCount: 1, mainHealth: 16, minionHealth: 8 },
  { id: 'willow', name: 'Willow', cards: willow, minionCount: 1, mainHealth: 14, minionHealth: 6, minionReviveHealth: 3 },
  { id: 'spike', name: 'Spike', cards: spike, minionCount: 1, mainHealth: 15, minionHealth: 7 },
  // Her two archers can be brought back as they fall, one per click of her own
  // button, for as long as the game lasts — see the "Add archer" control.
  { id: 'yennenga', name: 'Yennenga', cards: yennenga, minionCount: 2, mainHealth: 15, minionHealth: 2, minionReviveHealth: 2 },
  { id: 'achilles', name: 'Achilles', cards: achilles, minionCount: 1, mainHealth: 18, minionHealth: 6 },
  { id: 'bloodyMary', name: 'Bloody Mary', cards: bloodyMary, minionCount: 0, mainHealth: 16, minionHealth: 0 },
  // Like Squirrel Girl he starts with no minions and spawns them, but his
  // clones are torn off himself: each costs his main coin a point of health.
  { id: 'sunWukong', name: 'Sun Wukong', cards: sunWukong, minionCount: 0, mainHealth: 17, minionHealth: 1, spawnableMinionLimit: 3, minionSpawnSelfDamage: 1 },
];

export function getCharacterDef(id: string): CharacterDef | undefined {
  return CHARACTER_DEFS.find((character) => character.id === id);
}
