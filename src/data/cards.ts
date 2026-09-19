import card1 from '../assets/cards/card1.jpeg';
import card2 from '../assets/cards/card2.jpeg';
import card3 from '../assets/cards/card3.jpeg';
import card4 from '../assets/cards/card4.jpeg';
import card5 from '../assets/cards/card5.jpeg';

export interface CardData {
  id: string;
  image: string;
}

export const ALL_CARDS: CardData[] = [
  { id: 'card1', image: card1 },
  { id: 'card2', image: card2 },
  { id: 'card3', image: card3 },
  { id: 'card4', image: card4 },
  { id: 'card5', image: card5 },
  { id: 'card6', image: card2 },
  { id: 'card7', image: card4 },
  { id: 'card8', image: card1 },
  { id: 'card9', image: card5 },
  { id: 'card10', image: card3 },
  { id: 'card11', image: card1 },
  { id: 'card12', image: card4 },
  { id: 'card13', image: card2 },
];

export function pickRandomCards(count: number, pool: CardData[] = ALL_CARDS): CardData[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
