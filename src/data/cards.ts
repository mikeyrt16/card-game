import type { WireCard } from '../shared/protocol';
import { getCardImage } from './assets';

/** The client-side renderable form of a card — a resolved image URL rather
 *  than the character/slug pair the server deals in. */
export interface CardData {
  id: string;
  image: string;
}

export function toClientCard(card: WireCard): CardData {
  return { id: card.id, image: getCardImage(card.characterId, card.slug) };
}
