import { getCardBackImage, getCardImage, getCharacterPortrait } from './assets';
import { borg, federation, klingons, romulan, type CardData, type CardDefinition } from './cards';

export interface Character {
  id: string;
  name: string;
  portrait: string;
  cardBack: string;
  cards: CardDefinition[];
}

function defineCharacter(id: string, name: string, cards: CardDefinition[]): Character {
  return {
    id,
    name,
    portrait: getCharacterPortrait(id),
    cardBack: getCardBackImage(id),
    cards,
  };
}

export const CHARACTERS: Character[] = [
  defineCharacter('klingons', 'Klingons', klingons),
  defineCharacter('romulan', 'Romulan', romulan),
  defineCharacter('borg', 'Borg', borg),
  defineCharacter('federation', 'Federation', federation),
];

export function getCharacter(id: string | undefined): Character | undefined {
  return CHARACTERS.find((character) => character.id === id);
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Expands each card definition into `amount` copies and shuffles the result. */
export function buildCharacterDeck(character: Character): CardData[] {
  const deck: CardData[] = [];
  character.cards.forEach((cardDef, definitionIndex) => {
    const image = getCardImage(character.id, cardDef.image);
    for (let copy = 0; copy < cardDef.amount; copy += 1) {
      deck.push({ id: `${character.id}-${cardDef.image}-${definitionIndex}-${copy}`, image });
    }
  });
  return shuffle(deck);
}
