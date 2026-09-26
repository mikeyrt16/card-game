/** A 1x1 fully transparent GIF. Built once at module load so it's long
 *  decoded by the time any drag starts — `setDragImage` silently falls back
 *  to the browser's own snapshot if handed an image that isn't ready. */
const TRANSPARENT_PIXEL = new Image();
TRANSPARENT_PIXEL.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Suppresses the browser's native drag image, which is a flat bitmap taken
 *  once at dragstart and can't be restyled or animated afterwards, so that
 *  the real <DragPreview> element is the only thing following the pointer.
 *  Not simply omitted: with no drag image set the browser falls back to a
 *  snapshot of the dragged element instead. */
export function hideNativeDragImage(dataTransfer: DataTransfer): void {
  dataTransfer.setDragImage(TRANSPARENT_PIXEL, 0, 0);
}
