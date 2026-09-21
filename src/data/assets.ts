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

const mapModules = import.meta.glob('../assets/maps/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const coinModules = import.meta.glob('../assets/coins/*/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const specialModules = import.meta.glob('../assets/special/*/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const actionButtonModules = import.meta.glob('../assets/action-buttons/*.{png,jpg,jpeg,webp}', {
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
const mapsBySlug = indexByCapture(mapModules, /\/maps\/([^/.]+)\.[^./]+$/);
const coinsByKey = indexByCapture(coinModules, /\/coins\/([^/]+\/[^/.]+)\.[^./]+$/);
const specialByKey = indexByCapture(specialModules, /\/special\/([^/]+\/[^/.]+)\.[^./]+$/);
const actionButtonsByName = indexByCapture(actionButtonModules, /\/action-buttons\/([^/.]+)\.[^./]+$/);

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

/** Every map's slug (its filename, minus extension), in a stable sorted order. */
export function getMapIds(): string[] {
  return Object.keys(mapsBySlug).sort();
}

export function getMapImage(mapId: string): string {
  const url = mapsBySlug[mapId];
  if (!url) {
    throw new Error(`Missing map image for ${mapId}`);
  }
  return url;
}

export function getCoinImage(characterId: string, coinType: 'main' | 'minion'): string {
  const url = coinsByKey[`${characterId}/${coinType}`];
  if (!url) {
    throw new Error(`Missing coin image for ${characterId}/${coinType}`);
  }
  return url;
}

/** A character's special-component art, e.g. `getSpecialImage('alice', 'big')`. */
export function getSpecialImage(characterId: string, name: string): string {
  const url = specialByKey[`${characterId}/${name}`];
  if (!url) {
    throw new Error(`Missing special image for ${characterId}/${name}`);
  }
  return url;
}

export function getActionButtonImage(name: 'single' | 'double'): string {
  const url = actionButtonsByName[name];
  if (!url) {
    throw new Error(`Missing action button image for ${name}`);
  }
  return url;
}
