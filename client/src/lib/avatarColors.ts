// Deterministic avatar tint from a person's name — the same name always gets the same colour.
// Lived in features/tasks/ but only 3 of its 8 importers are tasks files; the rest are shared
// components (FilterPrimitives, PersonRow, UserMultiSelect) and other features (tickets, team),
// which meant components/ depended on a feature folder to render an avatar.
const AVATAR_PALETTE = [
  'bg-primary-600',
  'bg-coral-600',
  'bg-success',
  'bg-warning',
  'bg-danger',
  'bg-status-verify',
];

export const avatarColorClass = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};
