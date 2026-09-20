/** Wire protocol between the client and the game server. Pure types only —
 *  no browser or Node-specific APIs — so this file can be imported from
 *  both `src/` (Vite/browser) and `server/` (Node). */

export type PlayerSlot = 'player1' | 'player2';

export type PilePosition = 'top' | 'random' | 'bottom';

/** A single card instance as it travels over the wire: identifies the card
 *  definition (character + slug) rather than a resolved image URL, since
 *  the server has no knowledge of Vite-bundled asset paths. */
export interface WireCard {
  id: string;
  characterId: string;
  slug: string;
}

export interface HelloMessage {
  type: 'hello';
  token: string;
}

/** Actions a client can send once it has an assigned player slot. Every
 *  action only ever mutates the sending player's own board. */
export type GameAction =
  | { type: 'selectCharacter'; characterId: string }
  | { type: 'draw' }
  | { type: 'returnFromDiscard' }
  | { type: 'playCard'; cardId: string }
  | { type: 'removePlayedCard' }
  | { type: 'dropOnDrawPile'; cardId: string; position: PilePosition }
  | { type: 'dropOnDiscardPile'; cardId: string; position: PilePosition }
  | { type: 'dropOntoHand'; cardId: string; index: number }
  | { type: 'reorderHand'; order: string[] }
  | { type: 'reorderDiscard'; order: string[] }
  | { type: 'shuffleDiscard' };

export type ClientAction = HelloMessage | GameAction;

export interface PlayerView {
  characterId: string | null;
  connected: boolean;
  drawPileCount: number;
  /** Discard piles are public information. */
  discardPile: WireCard[];
  playedCard: WireCard | null;
}

export interface GameStateView {
  phase: 'selecting' | 'playing';
  /** The receiving player's own board — hand is only ever sent to its owner. */
  me: PlayerView & { hand: WireCard[] };
  /** null until the opponent has connected at least once. Hand is hidden,
   *  exposed only as a count. */
  opponent: (PlayerView & { handCount: number }) | null;
}

export type ServerMessage = { type: 'state'; state: GameStateView } | { type: 'error'; message: string };
