export const UPLOADS_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5050';

// Avatar URLs from the API are relative paths (e.g. "/uploads/avatars/<hex>.jpg").
export const resolveAvatarUrl = (avatarUrl: string | null | undefined) =>
  avatarUrl ? `${UPLOADS_BASE}${avatarUrl}` : null;
