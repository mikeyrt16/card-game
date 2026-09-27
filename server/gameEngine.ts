import { getCharacterDef } from '../src/shared/characters';
import { RESURRECTED_MINION_HEALTH, SHADOW_TOKEN_LIMIT, SQUIRREL_GIRL_MINION_LIMIT } from '../src/shared/protocol';
import type {
  BoardCardView,
  CoinState,
  CoinType,
  CursorPosition,
  DarknessView,
  DraggedCardView,
  GameAction,
  GamePhase,
  GameStateView,
  PilePosition,
  PlayerCoins,
  PlayerSlot,
  WireCard,
} from '../src/shared/protocol';

const INITIAL_HAND_SIZE = 5;

/** A card this player has put down on the map. Kept per-player rather than
 *  in one shared list so it flows through the same card-pool helpers as
 *  their hand and piles — a board card can be picked back up into any of
 *  them — and so ownership (who may flip it) is implicit. */
interface ServerBoardCard {
  card: WireCard;
  x: number;
  y: number;
  faceUp: boolean;
}

interface ServerPlayerState {
  token: string | null;
  connected: boolean;
  characterId: string | null;
  drawPile: WireCard[];
  discardPile: WireCard[];
  hand: WireCard[];
  boardCards: ServerBoardCard[];
  /** The opponent's hand as they last chose to reveal it — a snapshot, not
   *  a live view. Stored on the player who gets to *look*, so it can only
   *  ever be sent to them. */
  revealedHand: WireCard[];
  /** Last reported mouse position, for the other player to draw. Cleared on
   *  disconnect so a ghost cursor can't linger. */
  cursor: CursorPosition | null;
  /** Whether this player has their hand dock raised, mirrored onto the
   *  other player's screen. Also cleared on disconnect, so it can't stick
   *  open. */
  handOpen: boolean;
  /** The card they're dragging right now, so the other player can watch it
   *  move. Only the id is stored — what the opponent is allowed to see of
   *  it is worked out per broadcast, in buildDraggedCardView. */
  draggedCard: { cardId: string; x: number; y: number } | null;
  /** Running totals of cards dealt off this player's own draw pile, and of
   *  their board cards turned face up. Both clients play their respective
   *  sounds off a rise in these — see `PlayerView`. */
  cardsDrawn: number;
  boardCardsFlipped: number;
  minionsResurrected: number;
  pilesShuffled: number;
  cardsPlaced: number;
  coinsHealed: number;
  coinsHit: number;
}

export interface GameState {
  phase: GamePhase;
  selectedMapId: string | null;
  coins: Record<PlayerSlot, PlayerCoins>;
  /** Kept at game level rather than on Spike's player, like the coins:
   *  once placed it's shared furniture either player can move or clear. */
  darkness: DarknessView[];
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
    boardCards: [],
    revealedHand: [],
    cursor: null,
    handOpen: false,
    draggedCard: null,
    cardsDrawn: 0,
    boardCardsFlipped: 0,
    minionsResurrected: 0,
    pilesShuffled: 0,
    cardsPlaced: 0,
    coinsHealed: 0,
    coinsHit: 0,
  };
}

/** Player1's coins start on the left, player2's on the right — deterministic
 *  by slot, since there's no other basis to assign sides from. */
function coinXForSlot(slot: PlayerSlot): number {
  return slot === 'player1' ? 15 : 85;
}

const MINION_SPACING = 10;

/** Where the `index`-th of `total` fanned minion coins sits, stacked
 *  vertically and centered on the same spot the single minion coin used to
 *  occupy — so one minion looks identical to before, and more minions fan out
 *  from that same center rather than needing separate per-count layouts. */
function minionCoinPosition(x: number, index: number, total: number): { x: number; y: number } {
  const startY = 58 - ((total - 1) * MINION_SPACING) / 2;
  return { x, y: startY + index * MINION_SPACING };
}

/** A coin as it starts life: sitting where it's put, free rather than held,
 *  original face up, and never yet health-edited. The one place every coin's
 *  full shape is spelled out, so a new field on `CoinState` doesn't have to be
 *  remembered at each of the spots that make one. */
function createCoin(x: number, y: number, health: number): CoinState {
  return { x, y, draggedBy: null, health, altSide: false, healthEditDelta: 0, healthEditCount: 0 };
}

function createMinionCoins(x: number, count: number, health: number): CoinState[] {
  return Array.from({ length: count }, (_, i) => {
    const { x: minionX, y: minionY } = minionCoinPosition(x, i, count);
    return createCoin(minionX, minionY, health);
  });
}

/** How far out (in the same map-percentage units everything else here uses)
 *  a spawned squirrel minion lands from Squirrel Girl's main coin. */
const SQUIRREL_SPAWN_RADIUS = 8;

/** Where the `index`-th (of up to SQUIRREL_GIRL_MINION_LIMIT) squirrel minion
 *  spawns: near the main coin's own *current* position — wherever it's
 *  actually been dragged to, not its original starting spot — rather than
 *  the fixed vertical fan `minionCoinPosition` lays other characters'
 *  pre-placed minions out in. Evenly spaced around it in a ring, one slot
 *  per eventual minion (360° / the limit), so all eight end up spaced out
 *  round the coin instead of piling on the same point. */
function squirrelMinionSpawnPosition(main: { x: number; y: number }, index: number): { x: number; y: number } {
  const angle = (index / SQUIRREL_GIRL_MINION_LIMIT) * 2 * Math.PI;
  return {
    x: Math.max(0, Math.min(100, main.x + SQUIRREL_SPAWN_RADIUS * Math.cos(angle))),
    y: Math.max(0, Math.min(100, main.y + SQUIRREL_SPAWN_RADIUS * Math.sin(angle))),
  };
}

/** Neither minion count nor health is known yet at this point (no character
 *  picked) — every slot starts with a single, placeholder-health minion,
 *  then `selectCharacter` resizes/re-heals it to match whatever character
 *  gets chosen. */
function createInitialCoins(): Record<PlayerSlot, PlayerCoins> {
  return {
    player1: {
      main: createCoin(coinXForSlot('player1'), 45, 1),
      minions: createMinionCoins(coinXForSlot('player1'), 1, 1),
    },
    player2: {
      main: createCoin(coinXForSlot('player2'), 45, 1),
      minions: createMinionCoins(coinXForSlot('player2'), 1, 1),
    },
  };
}

export function createInitialState(): GameState {
  return {
    phase: 'character-select',
    selectedMapId: null,
    coins: createInitialCoins(),
    darkness: [],
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
    player.drawPile.find((c) => c.id === cardId) ??
    player.boardCards.find((b) => b.card.id === cardId)?.card
  );
}

/** Strips a card id out of every pool it could currently be sitting in —
 *  used before re-inserting it elsewhere (as a fresh instance), so a card
 *  dragged out of an open hand/discard/draw preview, or picked up off the
 *  map, can never end up duplicated across two pools. */
function removeCardEverywhere(player: ServerPlayerState, cardId: string): void {
  player.hand = player.hand.filter((c) => c.id !== cardId);
  player.discardPile = player.discardPile.filter((c) => c.id !== cardId);
  player.drawPile = player.drawPile.filter((c) => c.id !== cardId);
  player.boardCards = player.boardCards.filter((b) => b.card.id !== cardId);
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
  player.boardCards = [];
  player.revealedHand = [];
  // Different characters field different numbers of minions, and different
  // starting health for both main and minion coins — apply all of that now
  // that the character is known. Re-centers minions on the same spot
  // regardless of count, so this is safe to redo on every re-pick during
  // character-select.
  const def = getCharacterDef(characterId);
  const minionCount = def?.minionCount ?? 1;
  const minionHealth = def?.minionHealth ?? 1;
  state.coins[slot].main.health = def?.mainHealth ?? 1;
  // Reset explicitly (rather than left as whatever it was): createMinionCoins
  // below already starts the minions false by building fresh objects, but
  // main persists in place, so its own altSide needs the same reset spelled
  // out — otherwise re-picking a character with alt art, flipping the main
  // coin, then switching away and back would leave it stuck on the alt face.
  state.coins[slot].main.altSide = false;
  state.coins[slot].minions = createMinionCoins(coinXForSlot(slot), minionCount, minionHealth);
}

function draw(player: ServerPlayerState): void {
  if (player.drawPile.length === 0) {
    return;
  }
  const [top, ...rest] = player.drawPile;
  player.drawPile = rest;
  player.hand = [...player.hand, withNewId(top)];
  // Counted only now the deal has actually happened — the empty-pile bail
  // above leaves it alone, so no client plays a sound for nothing.
  player.cardsDrawn += 1;
}

function returnFromDiscard(player: ServerPlayerState): void {
  if (player.discardPile.length === 0) {
    return;
  }
  const [top, ...rest] = player.discardPile;
  player.discardPile = rest;
  player.hand = [...player.hand, withNewId(top)];
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
  // Counted only now the drop has actually landed — the not-found bail above
  // leaves it alone, so no client plays a sound for nothing.
  player.cardsPlaced += 1;
}

function dropOntoHand(player: ServerPlayerState, cardId: string, index: number): void {
  if (player.hand.some((c) => c.id === cardId)) {
    // Already in hand — a plain in-fan reorder, handled by reorderHand.
    return;
  }
  const card =
    player.discardPile.find((c) => c.id === cardId) ??
    player.drawPile.find((c) => c.id === cardId) ??
    player.boardCards.find((b) => b.card.id === cardId)?.card;
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
  player.boardCards = [];
  player.revealedHand = [];
  // token/connected are identity, not game progress — left untouched.
}

function returnToMainMenu(state: GameState): void {
  state.phase = 'character-select';
  state.selectedMapId = null;
  state.coins = createInitialCoins();
  state.darkness = [];
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

/** Willow's minion coming back. Unlike the open `updateCoinHealth` below,
 *  this is one character's specific move, so it's held to it: Willow only,
 *  her own minion only, and only one that's actually dead — reviving isn't a
 *  top-up for a minion that's still standing. */
function resurrectMinion(state: GameState, slot: PlayerSlot, minionIndex: number): void {
  if (state.players[slot].characterId !== 'willow') {
    return;
  }
  const coin = resolveCoin(state, slot, 'minion', minionIndex);
  if (!coin || coin.health > 0) {
    return;
  }
  coin.health = RESURRECTED_MINION_HEALTH;
  // Past the bails, so nothing is sounded on either screen for a resurrection
  // that didn't happen.
  state.players[slot].minionsResurrected += 1;
}

/** Squirrel Girl adding one more squirrel minion. Squirrel Girl only, and
 *  only up to SQUIRREL_GIRL_MINION_LIMIT for the whole game — past that this
 *  is a no-op, same as the shadow tokens once Spike's spent his three. The
 *  new coin lands in its own slot of the ring around the main coin's current
 *  position (computed against the limit, not the current count), so earlier
 *  minions that have since been dragged elsewhere aren't reshuffled by a
 *  later spawn. */
function spawnSquirrelMinion(state: GameState, slot: PlayerSlot): void {
  if (state.players[slot].characterId !== 'squirrelGirl') {
    return;
  }
  const coins = state.coins[slot];
  if (coins.minions.length >= SQUIRREL_GIRL_MINION_LIMIT) {
    return;
  }
  const health = getCharacterDef('squirrelGirl')?.minionHealth ?? 1;
  const position = squirrelMinionSpawnPosition(coins.main, coins.minions.length);
  coins.minions = [...coins.minions, createCoin(position.x, position.y, health)];
}

/** Like coin dragging, anyone can edit any coin's health — it's a shared HP
 *  tracker, not gated to the coin's own player. 0 or below is allowed
 *  through (that's what marks the coin dead on the client); only a
 *  non-finite value (a malformed message) is rejected. */
function updateCoinHealth(
  state: GameState,
  actorSlot: PlayerSlot,
  coinOwner: PlayerSlot,
  coinType: CoinType,
  minionIndex: number | undefined,
  health: number,
): void {
  const coin = resolveCoin(state, coinOwner, coinType, minionIndex);
  if (!coin || !Number.isFinite(health)) {
    return;
  }
  const next = Math.round(health);
  if (next === coin.health) {
    // Nothing actually changed, so nothing for either client to sound. The
    // dialog already disables its own Update button in this case; this just
    // means nothing else can sneak a no-op edit past it either.
    return;
  }
  // Which way it went is what decides whether both clients play the heal or
  // the hit. Counted against whoever made the edit rather than the coin's
  // owner: either player can edit any coin, and it's the editor's doing.
  // Deliberately only counted here, not wherever health happens to change —
  // Willow's resurrect raises it too, and that has its own sound rather than
  // also reading as a heal.
  if (next > coin.health) {
    state.players[actorSlot].coinsHealed += 1;
  } else {
    state.players[actorSlot].coinsHit += 1;
  }
  // What the floating number over the coin reads, and what marks it as a fresh
  // edit rather than a rebroadcast of this one — see `CoinState`.
  coin.healthEditDelta = next - coin.health;
  coin.healthEditCount += 1;
  coin.health = next;
}

/** Like coin dragging/health, any player can flip a coin's face — the
 *  server doesn't know which characters have alt art (that's Vite-bundled
 *  client asset data), so it trusts the client to only send this when the
 *  gesture is actually offered. */
function toggleCoinAltSide(
  state: GameState,
  coinOwner: PlayerSlot,
  coinType: CoinType,
  minionIndex: number | undefined,
): void {
  const coin = resolveCoin(state, coinOwner, coinType, minionIndex);
  if (!coin) {
    return;
  }
  coin.altSide = !coin.altSide;
}

/** Like coin dragging/health, either player can flip this — it's rendered
 *  (mirrored) on both screens, not just the Alice player's own. A no-op if
 *  `owner` isn't currently playing Alice (e.g. a stale click from just
 *  before they switched characters). */
/** Puts a card down on the map, or moves one that's already there. A card
 *  arriving from a hand or pile always lands face down; one already on the
 *  board keeps whichever way up it was, so sliding it about can't expose
 *  it. */
function dropCardOnBoard(player: ServerPlayerState, cardId: string, x: number, y: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }
  const clampedX = Math.max(0, Math.min(100, x));
  const clampedY = Math.max(0, Math.min(100, y));

  const placed = player.boardCards.find((b) => b.card.id === cardId);
  if (placed) {
    placed.x = clampedX;
    placed.y = clampedY;
    return;
  }

  const card = findDraggableCard(player, cardId);
  if (!card) {
    return;
  }
  removeCardEverywhere(player, cardId);
  player.boardCards = [
    ...player.boardCards,
    { card: withNewId(card), x: clampedX, y: clampedY, faceUp: false },
  ];
  // Only for a card actually newly landing here — the reposition branch
  // above (an existing board card just being slid about) returns before
  // this, so dragging one around the board doesn't replay the sound.
  player.cardsPlaced += 1;
}

/** Turning a card face up is one-way. Not theirs to turn over at all if it
 *  isn't in their own board cards, and once it's up it stays up — the
 *  opponent has seen it, so putting it back face down would only pretend
 *  otherwise. */
function flipBoardCard(player: ServerPlayerState, cardId: string): void {
  const placed = player.boardCards.find((b) => b.card.id === cardId);
  if (!placed || placed.faceUp) {
    return;
  }
  placed.faceUp = true;
  // Past the bails above, so a double-click on an already-revealed card — or
  // on one that isn't there — makes no sound on either screen.
  player.boardCardsFlipped += 1;
}

function moveCursor(player: ServerPlayerState, x: number, y: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }
  player.cursor = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
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
      player.pilesShuffled += 1;
      return;
    case 'shuffleDrawPile':
      player.drawPile = shuffle(player.drawPile);
      player.pilesShuffled += 1;
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
    case 'updateCoinHealth':
      updateCoinHealth(state, slot, action.coinOwner, action.coinType, action.minionIndex, action.health);
      return;
    case 'toggleCoinAltSide':
      toggleCoinAltSide(state, action.coinOwner, action.coinType, action.minionIndex);
      return;
    case 'resurrectMinion':
      resurrectMinion(state, slot, action.minionIndex);
      return;
    case 'spawnSquirrelMinion':
      spawnSquirrelMinion(state, slot);
      return;
    case 'moveCursor':
      moveCursor(player, action.x, action.y);
      return;
    case 'setHandOpen':
      player.handOpen = action.open;
      return;
    case 'dragCardTo':
      if (Number.isFinite(action.x) && Number.isFinite(action.y)) {
        player.draggedCard = { cardId: action.cardId, x: action.x, y: action.y };
      }
      return;
    case 'endCardDrag':
      player.draggedCard = null;
      return;
    case 'showHandToOpponent':
      // A snapshot handed to the opponent, not a live window: what they see
      // is the hand as it was when it was offered.
      state.players[opponentSlotOf(slot)].revealedHand = [...player.hand];
      return;
    case 'clearRevealedHand':
      player.revealedHand = [];
      return;
    case 'addDarkness':
      // Spike's to place, and only SHADOW_TOKEN_LIMIT of them for the whole
      // game. Nothing removes a placed patch, so the array's own length is
      // the count of what he's spent. Lands mid-map, to be dragged wherever
      // it's wanted from there.
      if (player.characterId === 'spike' && state.darkness.length < SHADOW_TOKEN_LIMIT) {
        state.darkness = [...state.darkness, { id: crypto.randomUUID(), x: 50, y: 50 }];
      }
      return;
    case 'moveDarkness': {
      if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) {
        return;
      }
      const patch = state.darkness.find((d) => d.id === action.id);
      if (patch) {
        patch.x = Math.max(0, Math.min(100, action.x));
        patch.y = Math.max(0, Math.min(100, action.y));
      }
      return;
    }
    case 'dropCardOnBoard':
      dropCardOnBoard(player, action.cardId, action.x, action.y);
      return;
    case 'flipBoardCard':
      flipBoardCard(player, action.cardId);
      return;
  }
}

/** Board cards for one viewer. A face-down card's identity is withheld
 *  from everyone but the player who put it there — they already know what
 *  they played, and their client needs it to animate the turn-over — so an
 *  opponent's face-down card genuinely cannot be read off the wire. */
function buildBoardCardViews(
  player: ServerPlayerState,
  owner: PlayerSlot,
  forSlot: PlayerSlot,
): BoardCardView[] {
  return player.boardCards.map((placed) => ({
    id: placed.card.id,
    owner,
    x: placed.x,
    y: placed.y,
    faceUp: placed.faceUp,
    card: placed.faceUp || owner === forSlot ? placed.card : null,
  }));
}

/** Whether the opponent is shown the card a player is dragging at all, and
 *  if so what of it.
 *
 *  Only a card out of a hand, or one already lying on the map, is broadcast.
 *  Dragging inside a draw- or discard-pile preview is private housekeeping
 *  on that player's own screen — those cards never leave it, so sending one
 *  flying across the opponent's board would just be noise.
 *
 *  The identity rides along only where the face is already public: a board
 *  card lying face up. One out of a hand, or a face-down board card,
 *  resolves to null and is drawn as a back, so picking it up reveals
 *  nothing. */
function buildDraggedCardView(player: ServerPlayerState): DraggedCardView | null {
  const dragged = player.draggedCard;
  if (!dragged) {
    return null;
  }
  const placed = player.boardCards.find((b) => b.card.id === dragged.cardId);
  const isFromHand = player.hand.some((c) => c.id === dragged.cardId);
  if (!placed && !isFromHand) {
    return null;
  }
  return {
    cardId: dragged.cardId,
    x: dragged.x,
    y: dragged.y,
    card: placed?.faceUp ? placed.card : null,
  };
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
    darkness: state.darkness,
    boardCards: [
      ...buildBoardCardViews(state.players.player1, 'player1', forSlot),
      ...buildBoardCardViews(state.players.player2, 'player2', forSlot),
    ],
    me: {
      characterId: me.characterId,
      connected: me.connected,
      drawPileCount: me.drawPile.length,
      drawPile: me.drawPile,
      discardPile: me.discardPile,
      hand: me.hand,
      revealedHand: me.revealedHand,
      cursor: me.cursor,
      handOpen: me.handOpen,
      draggedCard: buildDraggedCardView(me),
      cardsDrawn: me.cardsDrawn,
      boardCardsFlipped: me.boardCardsFlipped,
      minionsResurrected: me.minionsResurrected,
      pilesShuffled: me.pilesShuffled,
      cardsPlaced: me.cardsPlaced,
      coinsHealed: me.coinsHealed,
      coinsHit: me.coinsHit,
    },
    opponent: opponent.token
      ? {
          characterId: opponent.characterId,
          connected: opponent.connected,
          drawPileCount: opponent.drawPile.length,
          discardPile: opponent.discardPile,
          handCount: opponent.hand.length,
          cursor: opponent.cursor,
          handOpen: opponent.handOpen,
          draggedCard: buildDraggedCardView(opponent),
          cardsDrawn: opponent.cardsDrawn,
          boardCardsFlipped: opponent.boardCardsFlipped,
          minionsResurrected: opponent.minionsResurrected,
          pilesShuffled: opponent.pilesShuffled,
          cardsPlaced: opponent.cardsPlaced,
          coinsHealed: opponent.coinsHealed,
          coinsHit: opponent.coinsHit,
        }
      : null,
  };
}
