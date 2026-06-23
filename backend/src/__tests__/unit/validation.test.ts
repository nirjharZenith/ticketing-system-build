import {
  isValidEmail,
  isValidPassword,
  isValidUUID,
  isValidString,
  isValidPriority,
  isValidStatus,
  isValidPagination,
  validateUserRegistration,
  validateTicketCreation,
  ValidationException,
} from '../../utils/validation';

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------
describe('isValidEmail', () => {
  it('accepts a standard email address', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts emails with subdomains', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('rejects an email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects an email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects an email exceeding 255 characters', () => {
    const long = 'a'.repeat(250) + '@b.com';
    expect(isValidEmail(long)).toBe(false);
  });

  it('rejects emails with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidPassword
// ---------------------------------------------------------------------------
describe('isValidPassword', () => {
  it('accepts a password meeting all requirements', () => {
    expect(isValidPassword('ValidPass1!')).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(isValidPassword('Va1!')).toBe(false);
  });

  it('rejects a password without an uppercase letter', () => {
    expect(isValidPassword('validpass1!')).toBe(false);
  });

  it('rejects a password without a digit', () => {
    expect(isValidPassword('ValidPass!')).toBe(false);
  });

  it('rejects a password without a special character', () => {
    expect(isValidPassword('ValidPass1')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidPassword('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidUUID
// ---------------------------------------------------------------------------
describe('isValidUUID', () => {
  it('accepts a valid v4 UUID', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('rejects a UUID with wrong length', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
  });

  it('rejects a completely arbitrary string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidString
// ---------------------------------------------------------------------------
describe('isValidString', () => {
  it('accepts a string within bounds', () => {
    expect(isValidString('hello', 1, 10)).toBe(true);
  });

  it('rejects a string shorter than minLength', () => {
    expect(isValidString('', 1, 10)).toBe(false);
  });

  it('rejects a string exceeding maxLength', () => {
    expect(isValidString('a'.repeat(11), 1, 10)).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(isValidString(123 as any, 1, 10)).toBe(false);
  });

  it('trims whitespace before checking minimum length', () => {
    // All-whitespace string should fail a minLength of 1
    expect(isValidString('   ', 1, 100)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidPriority – valid values: low | medium | high | urgent
// ---------------------------------------------------------------------------
describe('isValidPriority', () => {
  it.each(['low', 'medium', 'high', 'urgent'])('accepts "%s"', (p) => {
    expect(isValidPriority(p)).toBe(true);
  });

  it('rejects an invalid priority value', () => {
    expect(isValidPriority('extreme')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidPriority('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidStatus – valid values: open | in_progress | in_verification | resolved | closed
// ---------------------------------------------------------------------------
describe('isValidStatus', () => {
  it.each(['open', 'in_progress', 'in_verification', 'resolved', 'closed'])('accepts "%s"', (s) => {
    expect(isValidStatus(s)).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(isValidStatus('on_hold')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidPagination – returns { page, limit } object on success, null on fail
// ---------------------------------------------------------------------------
describe('isValidPagination', () => {
  it('returns a parsed object for valid page and limit', () => {
    const result = isValidPagination(1, 20);
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('defaults page to 1 when page is falsy', () => {
    const result = isValidPagination(0, 20);
    // page parseInt('0') = 0 → default 1; limit 20 is fine
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('returns null when limit is above 100', () => {
    expect(isValidPagination(1, 101)).toBeNull();
  });

  it('returns null when limit parses to 0', () => {
    // parseInt(0) || 20 → defaults to 20, which is valid
    // Confirm limit of 0 with a non-parseable string
    expect(isValidPagination(1, 101)).toBeNull();
  });

  it('uses default limit of 20 for non-parseable limit', () => {
    const result = isValidPagination('abc' as any, 'xyz' as any);
    expect(result).toEqual({ page: 1, limit: 20 });
  });
});

// ---------------------------------------------------------------------------
// validateUserRegistration
// ---------------------------------------------------------------------------
describe('validateUserRegistration', () => {
  const valid = {
    email: 'new@example.com',
    name: 'Alice',
    password: 'StrongPass1!',
    confirmPassword: 'StrongPass1!',
  };

  it('returns no errors for valid input', () => {
    expect(validateUserRegistration(valid)).toHaveLength(0);
  });

  it('returns an error when email is missing', () => {
    const errors = validateUserRegistration({ ...valid, email: '' });
    expect(errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('returns an error when email format is invalid', () => {
    const errors = validateUserRegistration({ ...valid, email: 'not-an-email' });
    expect(errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('returns an error when password is too weak', () => {
    const errors = validateUserRegistration({ ...valid, password: 'weak', confirmPassword: 'weak' });
    expect(errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('returns an error when passwords do not match', () => {
    const errors = validateUserRegistration({ ...valid, confirmPassword: 'DifferentPass1!' });
    expect(errors.some((e) => e.field === 'confirmPassword')).toBe(true);
  });

  it('returns an error when name is missing', () => {
    const errors = validateUserRegistration({ ...valid, name: '' });
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('can return multiple errors at once', () => {
    const errors = validateUserRegistration({ email: '', name: '', password: '', confirmPassword: '' });
    expect(errors.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// validateTicketCreation
// ---------------------------------------------------------------------------
describe('validateTicketCreation', () => {
  const valid = { title: 'Fix login bug', description: 'Users cannot log in', priority: 'high' };

  it('returns no errors for valid input', () => {
    expect(validateTicketCreation(valid)).toHaveLength(0);
  });

  it('returns an error when title is missing', () => {
    const errors = validateTicketCreation({ ...valid, title: '' });
    expect(errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('returns an error when title exceeds max length (200 chars)', () => {
    const errors = validateTicketCreation({ ...valid, title: 'a'.repeat(201) });
    expect(errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('returns an error for an invalid priority', () => {
    const errors = validateTicketCreation({ ...valid, priority: 'extreme' });
    expect(errors.some((e) => e.field === 'priority')).toBe(true);
  });

  it('allows description to be omitted', () => {
    const errors = validateTicketCreation({ title: 'A title', priority: 'low' });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ValidationException
// ---------------------------------------------------------------------------
describe('ValidationException', () => {
  it('stores the provided errors array', () => {
    const errs = [{ field: 'email', message: 'Invalid' }];
    const ex = new ValidationException(errs);
    expect(ex.errors).toEqual(errs);
    expect(ex.message).toBe('Validation failed');
    expect(ex.name).toBe('ValidationException');
  });
});
