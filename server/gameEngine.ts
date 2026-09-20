import { getCharacterDef } from '../src/shared/characters';
import type {
  CoinState,
  CoinType,
  GameAction,
  GamePhase,
  GameStateView,
  PilePosition,
  PlayerCoins,
  PlayerSlot,
  WireCard,
} from '../src/shared/protocol';

const INITIAL_HAND_SIZE = 5;

interface ServerPlayerState {
  token: string | null;
  connected: boolean;
  characterId: string | null;
  drawPile: WireCard[];
  discardPile: WireCard[];
  hand: WireCard[];
  playedCard: WireCard | null;
}

export interface GameState {
  phase: GamePhase;
  selectedMapId: string | null;
  coins: Record<PlayerSlot, PlayerCoins>;
  players: Record<PlayerSlot, ServerPlayerState>;
}

export function createEmptyPlayer(): ServerPlayerState {
  return {
    token: null,
    connected: false,
    characterId: null,
    drawPile: [],
    discardPile: [],
    hand: [],
    playedCard: null,
  };
}

/** Player1's coins start on the left, player2's on the right — deterministic
 *  by slot, since there's no other basis to assign sides from. */
function coinXForSlot(slot: PlayerSlot): number {
  return slot === 'player1' ? 15 : 85;
}

/** Lays out `count` minion coins stacked vertically, centered on the same
 *  spot the single minion coin used to occupy — so one minion looks
 *  identical to before, and more minions fan out from that same center
 *  rather than needing separate per-count layouts. */
function createMinionCoins(x: number, count: number): CoinState[] {
  const spacing = 10;
  const startY = 58 - ((count - 1) * spacing) / 2;
  return Array.from({ length: count }, (_, i) => ({ x, y: startY + i * spacing, draggedBy: null }));
}

/** Minion count isn't known yet at this point (no character picked) — every
 *  slot starts with a single minion coin, then `selectCharacter` resizes it
 *  to match whatever the chosen character calls for. */
function createInitialCoins(): Record<PlayerSlot, PlayerCoins> {
  return {
    player1: { main: { x: coinXForSlot('player1'), y: 45, draggedBy: null }, minions: createMinionCoins(coinXForSlot('player1'), 1) },
    player2: { main: { x: coinXForSlot('player2'), y: 45, draggedBy: null }, minions: createMinionCoins(coinXForSlot('player2'), 1) },
  };
}

export function createInitialState(): GameState {
  return {
    phase: 'character-select',
    selectedMapId: null,
    coins: createInitialCoins(),
    players: { player1: createEmptyPlayer(), player2: createEmptyPlayer() },
  };
}

export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function withNewId(card: WireCard): WireCard {
  return { ...card, id: crypto.randomUUID() };
}

function buildDeck(characterId: string): WireCard[] {
  const def = getCharacterDef(characterId);
  if (!def) {
    throw new Error(`Unknown character ${characterId}`);
  }
  const deck: WireCard[] = [];
  def.cards.forEach((cardDef) => {
    for (let copy = 0; copy < cardDef.amount; copy += 1) {
      deck.push({ id: crypto.randomUUID(), characterId, slug: cardDef.image });
    }
  });
  return shuffle(deck);
}

function insertAtPosition(pile: WireCard[], card: WireCard, position: PilePosition): WireCard[] {
  if (position === 'top') {
    return [card, ...pile];
  }
  if (position === 'bottom') {
    return [...pile, card];
  }
  const index = Math.floor(Math.random() * (pile.length + 1));
  return [...pile.slice(0, index), card, ...pile.slice(index)];
}

function findDraggableCard(player: ServerPlayerState, cardId: string): WireCard | undefined {
  return (
    player.hand.find((c) => c.id === cardId) ??
    player.discardPile.find((c) => c.id === cardId) ??
    player.drawPile.find((c) => c.id === cardId)
  );
}

/** Strips a card id out of every pool it could currently be sitting in —
 *  used before re-inserting it elsewhere (as a fresh instance), so a card
 *  dragged out of an open hand/discard/draw preview can never end up
 *  duplicated across two pools. */
function removeCardEverywhere(player: ServerPlayerState, cardId: string): void {
  player.hand = player.hand.filter((c) => c.id !== cardId);
  player.discardPile = player.discardPile.filter((c) => c.id !== cardId);
  player.drawPile = player.drawPile.filter((c) => c.id !== cardId);
}

function reorderByIds(cards: WireCard[], order: string[]): WireCard[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const reordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const includedIds = new Set(reordered.map((card) => card.id));
  const missing = cards.filter((card) => !includedIds.has(card.id));
  return [...reordered, ...missing];
}

function selectCharacter(state: GameState, slot: PlayerSlot, characterId: string): void {
  if (state.phase !== 'character-select') {
    return;
  }
  const player = state.players[slot];
  const opponent = state.players[opponentSlotOf(slot)];
  if (characterId === player.characterId) {
    // Already picked — nothing to do (and no point re-shuffling a fresh deck).
    return;
  }
  if (characterId === opponent.characterId) {
    // Taken by the other player.
    return;
  }
  const deck = buildDeck(characterId);
  player.characterId = characterId;
  player.hand = deck.slice(0, INITIAL_HAND_SIZE);
  player.drawPile = deck.slice(INITIAL_HAND_SIZE);
  player.discardPile = [];
  player.playedCard = null;
  // Different characters field different numbers of minions — resize this
  // slot's minion coins to match, now that the character (and therefore
  // the count) is known. Re-centers on the same spot regardless of count,
  // so this is safe to redo on every re-pick during character-select.
  const minionCount = getCharacterDef(characterId)?.minionCount ?? 1;
  state.coins[slot].minions = createMinionCoins(coinXForSlot(slot), minionCount);
}

function draw(player: ServerPlayerState): void {
  if (player.drawPile.length === 0) {
    return;
  }
  const [top, ...rest] = player.drawPile;
  player.drawPile = rest;
  player.hand = [...player.hand, withNewId(top)];
}

function returnFromDiscard(player: ServerPlayerState): void {
  if (player.discardPile.length === 0) {
    return;
  }
  const [top, ...rest] = player.discardPile;
  player.discardPile = rest;
  player.hand = [...player.hand, withNewId(top)];
}

function playCard(player: ServerPlayerState, cardId: string): void {
  if (player.playedCard) {
    return;
  }
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) {
    return;
  }
  player.hand = player.hand.filter((c) => c.id !== cardId);
  player.playedCard = withNewId(card);
}

function removePlayedCard(player: ServerPlayerState): void {
  if (!player.playedCard) {
    return;
  }
  player.hand = [...player.hand, withNewId(player.playedCard)];
  player.playedCard = null;
}

function dropOnDrawPile(player: ServerPlayerState, cardId: string, position: PilePosition): void {
  const card = findDraggableCard(player, cardId);
  if (!card) {
    return;
  }
  removeCardEverywhere(player, cardId);
  player.drawPile = insertAtPosition(player.drawPile, withNewId(card), position);
}

function dropOnDiscardPile(player: ServerPlayerState, cardId: string, position: PilePosition): void {
  const card = findDraggableCard(player, cardId);
  if (!card) {
    return;
  }
  removeCardEverywhere(player, cardId);
  player.discardPile = insertAtPosition(player.discardPile, withNewId(card), position);
}

function dropOntoHand(player: ServerPlayerState, cardId: string, index: number): void {
  if (player.hand.some((c) => c.id === cardId)) {
    // Already in hand — a plain in-fan reorder, handled by reorderHand.
    return;
  }
  const card = player.discardPile.find((c) => c.id === cardId) ?? player.drawPile.find((c) => c.id === cardId);
  if (!card) {
    return;
  }
  removeCardEverywhere(player, cardId);
  const clampedIndex = Math.max(0, Math.min(index, player.hand.length));
  player.hand = [...player.hand.slice(0, clampedIndex), withNewId(card), ...player.hand.slice(clampedIndex)];
}

function continueToMapSelect(state: GameState): void {
  const bothPicked = state.players.player1.characterId && state.players.player2.characterId;
  if (state.phase === 'character-select' && bothPicked) {
    state.phase = 'map-select';
  }
}

function selectMap(state: GameState, mapId: string): void {
  // The server has no map catalog to validate against (map art is
  // Vite-bundled client-side, never sent here) — just relay whatever the
  // client picked so both sides broadcast-sync to the same choice.
  if (state.phase === 'map-select') {
    state.selectedMapId = mapId;
  }
}

function continueToGame(state: GameState): void {
  if (state.phase === 'map-select') {
    state.phase = 'playing';
  }
}

function resetPlayerToCharacterSelect(player: ServerPlayerState): void {
  player.characterId = null;
  player.drawPile = [];
  player.discardPile = [];
  player.hand = [];
  player.playedCard = null;
  // token/connected are identity, not game progress — left untouched.
}

function returnToMainMenu(state: GameState): void {
  state.phase = 'character-select';
  state.selectedMapId = null;
  state.coins = createInitialCoins();
  resetPlayerToCharacterSelect(state.players.player1);
  resetPlayerToCharacterSelect(state.players.player2);
}

/** Resolves the specific coin a (coinType, minionIndex) pair refers to —
 *  'main' has exactly one instance; 'minion' is looked up by index into
 *  that slot's (character-sized) minions array. Undefined if the index is
 *  out of range, e.g. a stale minionIndex from before a character re-pick
 *  shrank the array. */
function resolveCoin(
  state: GameState,
  owner: PlayerSlot,
  coinType: CoinType,
  minionIndex: number | undefined,
): CoinState | undefined {
  const playerCoins = state.coins[owner];
  return coinType === 'main' ? playerCoins.main : playerCoins.minions[minionIndex ?? 0];
}

function startDragCoin(
  state: GameState,
  actorSlot: PlayerSlot,
  coinOwner: PlayerSlot,
  coinType: CoinType,
  minionIndex: number | undefined,
): void {
  const coin = resolveCoin(state, coinOwner, coinType, minionIndex);
  if (!coin) {
    return;
  }
  if (coin.draggedBy && coin.draggedBy !== actorSlot) {
    // Someone else already has it.
    return;
  }
  coin.draggedBy = actorSlot;
}

function moveCoin(
  state: GameState,
  actorSlot: PlayerSlot,
  coinOwner: PlayerSlot,
  coinType: CoinType,
  minionIndex: number | undefined,
  x: number,
  y: number,
): void {
  const coin = resolveCoin(state, coinOwner, coinType, minionIndex);
  if (!coin || coin.draggedBy !== actorSlot) {
    // Not currently yours to move — ignore (e.g. a stale/out-of-order message).
    return;
  }
  coin.x = Math.max(0, Math.min(100, x));
  coin.y = Math.max(0, Math.min(100, y));
}

function endDragCoin(
  state: GameState,
  actorSlot: PlayerSlot,
  coinOwner: PlayerSlot,
  coinType: CoinType,
  minionIndex: number | undefined,
): void {
  const coin = resolveCoin(state, coinOwner, coinType, minionIndex);
  if (coin?.draggedBy === actorSlot) {
    coin.draggedBy = null;
  }
}

export function applyAction(state: GameState, slot: PlayerSlot, action: GameAction): void {
  const player = state.players[slot];
  switch (action.type) {
    case 'selectCharacter':
      selectCharacter(state, slot, action.characterId);
      return;
    case 'continueToMapSelect':
      continueToMapSelect(state);
      return;
    case 'selectMap':
      selectMap(state, action.mapId);
      return;
    case 'continueToGame':
      continueToGame(state);
      return;
    case 'draw':
      draw(player);
      return;
    case 'returnFromDiscard':
      returnFromDiscard(player);
      return;
    case 'playCard':
      playCard(player, action.cardId);
      return;
    case 'removePlayedCard':
      removePlayedCard(player);
      return;
    case 'dropOnDrawPile':
      dropOnDrawPile(player, action.cardId, action.position);
      return;
    case 'dropOnDiscardPile':
      dropOnDiscardPile(player, action.cardId, action.position);
      return;
    case 'dropOntoHand':
      dropOntoHand(player, action.cardId, action.index);
      return;
    case 'reorderHand':
      player.hand = reorderByIds(player.hand, action.order);
      return;
    case 'reorderDiscard':
      player.discardPile = reorderByIds(player.discardPile, action.order);
      return;
    case 'reorderDrawPile':
      player.drawPile = reorderByIds(player.drawPile, action.order);
      return;
    case 'shuffleDiscard':
      player.discardPile = shuffle(player.discardPile);
      return;
    case 'shuffleDrawPile':
      player.drawPile = shuffle(player.drawPile);
      return;
    case 'returnToMainMenu':
      returnToMainMenu(state);
      return;
    case 'startDragCoin':
      startDragCoin(state, slot, action.coinOwner, action.coinType, action.minionIndex);
      return;
    case 'moveCoin':
      moveCoin(state, slot, action.coinOwner, action.coinType, action.minionIndex, action.x, action.y);
      return;
    case 'endDragCoin':
      endDragCoin(state, slot, action.coinOwner, action.coinType, action.minionIndex);
      return;
  }
}

function opponentSlotOf(slot: PlayerSlot): PlayerSlot {
  return slot === 'player1' ? 'player2' : 'player1';
}

export function buildView(state: GameState, forSlot: PlayerSlot): GameStateView {
  const me = state.players[forSlot];
  const opponent = state.players[opponentSlotOf(forSlot)];

  return {
    phase: state.phase,
    mySlot: forSlot,
    selectedMapId: state.selectedMapId,
    coins: state.coins,
    me: {
      characterId: me.characterId,
      connected: me.connected,
      drawPileCount: me.drawPile.length,
      drawPile: me.drawPile,
      discardPile: me.discardPile,
      playedCard: me.playedCard,
      hand: me.hand,
    },
    opponent: opponent.token
      ? {
          characterId: opponent.characterId,
          connected: opponent.connected,
          drawPileCount: opponent.drawPile.length,
          discardPile: opponent.discardPile,
          playedCard: opponent.playedCard,
          handCount: opponent.hand.length,
        }
      : null,
  };
}
