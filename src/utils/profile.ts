import type { UserLevel } from '../types';

/** Identificador guardado en BD para el logo oficial (icon-512.png). */
export const ZARDAIN_LOGO_AVATAR = 'zardain-logo';
export const ZARDAIN_LOGO_SRC = '/icon-512.png';

export function isZardainLogoAvatar(avatar: string): boolean {
  return avatar === ZARDAIN_LOGO_AVATAR;
}

export const PROFILE_AVATAR_GROUPS = [
  { label: 'Zardain', avatars: [ZARDAIN_LOGO_AVATAR] },
  { label: 'Caras', avatars: ['😊', '😎', '🤩', '🥳', '😋', '🤠'] },
  { label: 'Comida', avatars: ['🍔', '🍟', '🌉', '🍕', '🌮', '☕'] },
  { label: 'Animales', avatars: ['🦊', '🐻', '🦁', '🐶', '🐱', '🦄'] },
  { label: 'Extra', avatars: ['🚀', '⭐', '🔥', '💎', '⚡', '🎯'] },
] as const;

export const PROFILE_AVATARS = PROFILE_AVATAR_GROUPS.flatMap((g) => g.avatars);

export const PROFILE_COLORS = [
  '#e85d04',
  '#dc2f02',
  '#ff6600',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#ca8a04',
  '#1e293b',
] as const;

export type ProfileFrame = 'none' | 'gold' | 'fire' | 'zardas' | 'diamond';

export const PROFILE_FRAMES: { id: ProfileFrame; label: string; icon: string }[] = [
  { id: 'none', label: 'Clásico', icon: '○' },
  { id: 'gold', label: 'Oro', icon: '✨' },
  { id: 'fire', label: 'Fuego', icon: '🔥' },
  { id: 'zardas', label: 'Zardas', icon: '💎' },
  { id: 'diamond', label: 'Diamante', icon: '💠' },
];

export function getProfileDisplay(user: {
  name: string;
  profileAvatar?: string;
  profileColor?: string;
  profileTagline?: string;
  profileFrame?: string;
}) {
  const frame = (user.profileFrame ?? 'none') as ProfileFrame;
  const validFrame = PROFILE_FRAMES.some((f) => f.id === frame) ? frame : 'none';

  return {
    avatar: user.profileAvatar ?? '😊',
    color: user.profileColor ?? '#e85d04',
    tagline: user.profileTagline?.trim() ?? '',
    frame: validFrame,
    name: user.name,
  };
}

export function getLevelLabel(level: UserLevel): string {
  const labels: Record<UserLevel, string> = {
    hierro: 'Hierro',
    bronce: 'Bronce',
    plata: 'Plata',
    oro: 'Oro',
    platino: 'Platino',
    diamante: 'Diamante',
  };
  return labels[level];
}
