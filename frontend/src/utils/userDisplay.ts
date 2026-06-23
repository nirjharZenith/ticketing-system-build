import { User } from '../context/AuthContext';

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const looksLikeEmail = (value: string): boolean => EMAIL_LIKE.test(value.trim());

export const normalizeUser = (raw: unknown): User | null => {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  if (!id || !email) return null;

  let name = typeof record.name === 'string' ? record.name.trim() : undefined;
  if (name && looksLikeEmail(name) && name.toLowerCase() === email) {
    name = undefined;
  }

  return { id, email, name: name || undefined };
};

export const getUserDisplayName = (user: User | null | undefined): string => {
  if (!user) return 'User';

  if (user.name && !looksLikeEmail(user.name)) {
    return user.name.split(/\s+/)[0];
  }

  return user.email.split('@')[0] || 'User';
};

export const getUserFullDisplayName = (user: User | null | undefined): string => {
  if (!user) return 'User';

  if (user.name && !looksLikeEmail(user.name)) {
    return user.name;
  }

  return user.email.split('@')[0] || 'User';
};

export const getUserInitials = (user: User | null | undefined): string => {
  const label = getUserFullDisplayName(user);
  return label
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};
