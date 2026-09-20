const cardImageModules = import.meta.glob('../assets/cards/*/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const cardBackModules = import.meta.glob('../assets/card-back/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const characterPortraitModules = import.meta.glob('../assets/characters/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const characterCardModules = import.meta.glob('../assets/character-card/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function indexByCapture(modules: Record<string, string>, pattern: RegExp): Record<string, string> {
  const index: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const match = path.match(pattern);
    if (match) {
      index[match[1]] = url;
    }
  }
  return index;
}

const cardImagesByKey = indexByCapture(cardImageModules, /\/cards\/([^/]+\/[^/.]+)\.[^./]+$/);
const cardBacksByCharacter = indexByCapture(cardBackModules, /\/card-back\/([^/.]+)\.[^./]+$/);
const characterPortraitsByCharacter = indexByCapture(
  characterPortraitModules,
  /\/characters\/([^/.]+)\.[^./]+$/,
);
const characterCardsByCharacter = indexByCapture(
  characterCardModules,
  /\/character-card\/([^/.]+)\.[^./]+$/,
);

export function getCardImage(characterId: string, slug: string): string {
  const url = cardImagesByKey[`${characterId}/${slug}`];
  if (!url) {
    throw new Error(`Missing card image for ${characterId}/${slug}`);
  }
  return url;
}

export function getCardBackImage(characterId: string): string {
  const url = cardBacksByCharacter[characterId];
  if (!url) {
    throw new Error(`Missing card-back image for ${characterId}`);
  }
  return url;
}

export function getCharacterPortrait(characterId: string): string {
  const url = characterPortraitsByCharacter[characterId];
  if (!url) {
    throw new Error(`Missing character portrait for ${characterId}`);
  }
  return url;
}

export function getCharacterCardImage(characterId: string): string {
  const url = characterCardsByCharacter[characterId];
  if (!url) {
    throw new Error(`Missing character card image for ${characterId}`);
  }
  return url;
}
