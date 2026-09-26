import { getInverseMapImage, getMapIds, getMapImage } from './assets';

export interface MapInfo {
  id: string;
  name: string;
  image: string;
  /** The same art rotated 180°, shown to whichever player is viewing the
   *  board from the opposite side. */
  inverseImage: string;
}

function toTitleCase(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const MAPS: MapInfo[] = getMapIds().map((id) => ({
  id,
  name: toTitleCase(id),
  image: getMapImage(id),
  inverseImage: getInverseMapImage(id),
}));
