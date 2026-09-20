import { getCharacterDef } from '../src/shared/characters';
import type { GameAction, GameStateView, PilePosition, PlayerSlot, WireCard } from '../src/shared/protocol';

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

export function createInitialState(): GameState {
  return { players: { player1: createEmptyPlayer(), player2: createEmptyPlayer() } };
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
  return player.hand.find((c) => c.id === cardId) ?? player.discardPile.find((c) => c.id === cardId);
}

function reorderByIds(cards: WireCard[], order: string[]): WireCard[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const reordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const includedIds = new Set(reordered.map((card) => card.id));
  const missing = cards.filter((card) => !includedIds.has(card.id));
  return [...reordered, ...missing];
}

function selectCharacter(player: ServerPlayerState, characterId: string): void {
  if (player.characterId) {
    return;
  }
  const deck = buildDeck(characterId);
  player.characterId = characterId;
  player.hand = deck.slice(0, INITIAL_HAND_SIZE);
  player.drawPile = deck.slice(INITIAL_HAND_SIZE);
  player.discardPile = [];
  player.playedCard = null;
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
  player.drawPile = insertAtPosition(player.drawPile, withNewId(card), position);
  player.discardPile = player.discardPile.filter((c) => c.id !== cardId);
  player.hand = player.hand.filter((c) => c.id !== cardId);
}

function dropOnDiscardPile(player: ServerPlayerState, cardId: string, position: PilePosition): void {
  // This drop zone is only ever shown while the discard preview itself is
  // closed, so in practice this is always a hand -> discard move.
  const card = findDraggableCard(player, cardId);
  if (!card) {
    return;
  }
  player.discardPile = insertAtPosition(player.discardPile, withNewId(card), position);
  player.hand = player.hand.filter((c) => c.id !== cardId);
}

function dropOntoHand(player: ServerPlayerState, cardId: string, index: number): void {
  if (player.hand.some((c) => c.id === cardId)) {
    // Already in hand — a plain in-fan reorder, handled by reorderHand.
    return;
  }
  const card = player.discardPile.find((c) => c.id === cardId);
  if (!card) {
    return;
  }
  player.discardPile = player.discardPile.filter((c) => c.id !== cardId);
  const clampedIndex = Math.max(0, Math.min(index, player.hand.length));
  player.hand = [...player.hand.slice(0, clampedIndex), withNewId(card), ...player.hand.slice(clampedIndex)];
}

export function applyAction(state: GameState, slot: PlayerSlot, action: GameAction): void {
  const player = state.players[slot];
  switch (action.type) {
    case 'selectCharacter':
      selectCharacter(player, action.characterId);
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
    case 'shuffleDiscard':
      player.discardPile = shuffle(player.discardPile);
      return;
  }
}

function opponentSlotOf(slot: PlayerSlot): PlayerSlot {
  return slot === 'player1' ? 'player2' : 'player1';
}

export function buildView(state: GameState, forSlot: PlayerSlot): GameStateView {
  const me = state.players[forSlot];
  const opponent = state.players[opponentSlotOf(forSlot)];
  const phase: GameStateView['phase'] = me.characterId && opponent.characterId ? 'playing' : 'selecting';

  return {
    phase,
    me: {
      characterId: me.characterId,
      connected: me.connected,
      drawPileCount: me.drawPile.length,
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
