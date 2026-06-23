import {
  getUserDisplayName,
  getUserFullDisplayName,
  looksLikeEmail,
  normalizeUser,
} from './userDisplay';

describe('userDisplay', () => {
  it('normalizes user objects from the API', () => {
    expect(
      normalizeUser({ id: '1', email: 'Alice@Example.com', name: 'Alice' })
    ).toEqual({ id: '1', email: 'alice@example.com', name: 'Alice' });
  });

  it('drops email-like names that match the email address', () => {
    expect(
      normalizeUser({
        id: '1',
        email: 'nirjharsarkar0087@gmail.com',
        name: 'nirjharsarkar0087@gmail.com',
      })
    ).toEqual({ id: '1', email: 'nirjharsarkar0087@gmail.com' });
  });

  it('uses the email prefix when the stored name is an email address', () => {
    const user = normalizeUser({
      id: '1',
      email: 'nirjharsarkar8@gmail.com',
      name: 'nirjharsarkar0087@gmail.com',
    });

    expect(getUserDisplayName(user)).toBe('nirjharsarkar8');
    expect(getUserFullDisplayName(user)).toBe('nirjharsarkar8');
  });

  it('prefers a real name when available', () => {
    const user = normalizeUser({
      id: '1',
      email: 'nirjharsarkar8@gmail.com',
      name: 'Nirjhar Sarkar',
    });

    expect(getUserDisplayName(user)).toBe('Nirjhar');
    expect(getUserFullDisplayName(user)).toBe('Nirjhar Sarkar');
    expect(looksLikeEmail('Nirjhar Sarkar')).toBe(false);
  });
});
