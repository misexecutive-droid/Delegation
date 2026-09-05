/**
 * How far a pointer may travel before the gesture counts as a drag rather than a tap.
 *
 * Used for two things that must agree: the MouseSensor's activation distance (below this, no drag
 * starts) and the click-suppression check on a draggable card (above this, the click that follows
 * a release is the tail of a drag, not a tap, and must not open a detail view). If those two used
 * different numbers there'd be a band of travel where a drag began but its trailing click still
 * counted as a tap.
 *
 * Kept here rather than in either board file because both the delegation and ticket boards need
 * it, and importing it from a board would put the card components in an import cycle with the
 * board that renders them.
 */
export const DRAG_SLOP_PX = 8;
