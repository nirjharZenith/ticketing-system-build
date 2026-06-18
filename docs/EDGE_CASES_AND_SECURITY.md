# Edge Cases & Security Handling

This document outlines all edge cases, security vulnerabilities, and how they're handled in the ticketing system.

## Security Vulnerabilities & Mitigations

### 1. SQL Injection
**Risk**: Attackers can manipulate SQL queries through user input.

**Mitigations Implemented**:
- Parameterized queries with placeholders ($1, $2, etc.)
- Input validation and sanitization
- No dynamic SQL string concatenation

```typescript
// ✓ SAFE - Parameterized query
const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail] // Parameters passed separately
);

// ✗ DANGEROUS - Never do this
const result = await query(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### 2. Cross-Site Request Forgery (CSRF)
**Risk**: Attackers perform unauthorized actions on behalf of users.

**Mitigations Implemented**:
- CORS configuration restricts origin
- Token-based authentication (JWT)
- Proper HTTP method usage (GET for retrieval, POST for creation)

```typescript
// CORS properly configured
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
}));
```

### 3. File Upload Vulnerabilities
**Risk**: Unrestricted file uploads can lead to code execution.

**Mitigations Implemented**:
- File size limits (10MB max)
- File type whitelist validation
- File type checking by MIME type
- Files stored outside web root
- Random filename generation

```typescript
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  // ... whitelist only safe types
];

// Validate before upload
if (!isValidFileType(mimeType)) {
  throw new Error('File type not allowed');
}
```

### 4. Broken Authentication
**Risk**: Weak authentication allows unauthorized access.

**Mitigations Implemented**:
- Password hashing with bcrypt (10 salt rounds)
- Strong password requirements (8+ chars, uppercase, number, special char)
- JWT tokens with expiration
- Timing attack prevention in authentication

```typescript
// Password validation enforced
const isValidPassword = (password) => {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
};

// Timing attack prevention
const elapsed = Date.now() - startTime;
if (elapsed < 100) {
  await new Promise(resolve => setTimeout(resolve, 100 - elapsed));
}
```

### 5. Broken Access Control (IDOR - Insecure Direct Object Reference)
**Risk**: Users access resources they shouldn't have permission to.

**Mitigations Implemented**:
- Membership verification for organization access
- Role-based access control (RBAC)
- User filtering in database queries
- Owner/creator verification

```typescript
// Check if user is member of organization
const result = await query(
  `SELECT role FROM user_organisations 
   WHERE user_id = $1 AND organisation_id = $2 AND is_active = true`,
  [req.user.id, org_id]
);

if (result.rows.length === 0) {
  throw new AuthorizationError('Access denied');
}
```

### 6. Insufficient Input Validation
**Risk**: Invalid input causes unexpected behavior or crashes.

**Mitigations Implemented**:
- Comprehensive validation layer
- Email format validation
- UUID format validation
- String length limits
- Priority/status enum validation
- Type checking

```typescript
// Input validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

export const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
```

### 7. Sensitive Data Exposure
**Risk**: User passwords, tokens, or sensitive data exposed in logs or responses.

**Mitigations Implemented**:
- Passwords never returned in responses
- Sensitive data excluded from logs
- HTTPS recommended in production
- Tokens expire automatically
- No sensitive data in error messages

```typescript
// ✓ Never return password
return {
  user: { id: user.id, email: user.email, name: user.name }
  // password_hash is NOT included
};
```

### 8. XML External Entity (XXE) Injection
**Risk**: If XML is processed, external entity attacks possible.

**Mitigations Implemented**:
- Currently not applicable (no XML processing)
- If added: Disable external entity resolution
- Use safe parsing libraries

### 9. Broken Object Level Authorization
**Risk**: Users modify tickets or data belonging to others.

**Mitigations Implemented**:
- Creator verification on ticket updates
- Admin role check
- Organization membership verification
- Soft delete prevention (no hard deletes)

```typescript
// Only creator or admin can update
if (req.user!.org_role !== 'admin' && ticketResult.rows[0].creator_id !== req.user!.id) {
  throw new AuthorizationError('Only creator or admin can update');
}
```

### 10. Rate Limiting
**Risk**: Brute force attacks, DoS attacks.

**Mitigations Implemented**:
- Global rate limiter (100 req/15min)
- Auth rate limiter (5 req/15min) - stricter for login
- API rate limiter (30 req/min)
- Request headers with rate limit info

```typescript
// Stricter limits for sensitive endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5, // Only 5 attempts
});
```

---

## Edge Cases & Handling

### 1. Concurrent Ticket Creation
**Issue**: Multiple users creating tickets simultaneously.

**Handling**:
- Database constraints ensure data integrity
- Auto-increment IDs prevent duplicates
- Timestamps handled server-side
- Activity log captures all operations

### 2. Null/Undefined Values
**Issue**: Missing or null input values cause errors.

**Handling**:
```typescript
// Validation catches missing values
if (!title || !isValidTicketTitle(title)) {
  throw error; // Validation error
}

// Default values provided
const priority = req.body.priority || 'medium';
const description = req.body.description || '';
```

### 3. Invalid User IDs
**Issue**: Non-existent or malformed user references.

**Handling**:
```typescript
// UUID validation
if (!isValidUUID(userId)) {
  throw new NotFoundError('User');
}

// Database query returns empty if not found
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
if (result.rows.length === 0) {
  throw new NotFoundError('User');
}
```

### 4. Email Already Exists
**Issue**: Duplicate email registration.

**Handling**:
```typescript
try {
  await query('INSERT INTO users ...', values);
} catch (error) {
  if (error.code === '23505') { // Unique violation
    throw new ConflictError('Email already exists');
  }
}
```

### 5. Token Expiration
**Issue**: Expired JWT tokens used for requests.

**Handling**:
```typescript
if (err.name === 'TokenExpiredError') {
  return res.status(401).json({
    code: 'TOKEN_EXPIRED',
    message: 'Token has expired'
  });
}
```

### 6. Large Payload Attacks
**Issue**: Extremely large request bodies crash server.

**Handling**:
```typescript
// Size limits on JSON body
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb' }));
```

### 7. Invalid Pagination Parameters
**Issue**: Page size 0, negative page numbers.

**Handling**:
```typescript
export const isValidPagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return null;
  }
  return { page: pageNum, limit: limitNum };
};
```

### 8. Ticket Status Transitions
**Issue**: Invalid status changes (e.g., closed → open).

**Current Behavior**: System allows all valid status values.

**Recommendation**: Add state machine validation:
```typescript
const VALID_TRANSITIONS = {
  open: ['in_progress', 'closed', 'on_hold'],
  in_progress: ['closed', 'on_hold', 'open'],
  on_hold: ['open', 'in_progress'],
  closed: [] // Terminal state
};
```

### 9. Orphaned Records
**Issue**: User deleted while tickets assigned to them.

**Handling**:
- Soft delete (is_active flag)
- Foreign key constraints with ON UPDATE CASCADE
- Activity history preserved

### 10. Email Delivery Failures
**Issue**: Email service down or incorrect configuration.

**Handling**:
```typescript
// Fire-and-forget with error logging
emailService.sendTicketCreatedEmail(...).catch((err) => {
  console.error('[v0] Failed to send email:', err);
  // Don't fail the entire request
});
```

### 11. Timezone Issues
**Issue**: Timestamps stored in different timezones.

**Current**: Server stores UTC in database.

**Best Practice**:
```typescript
// Always use UTC
const timestamp = new Date().toISOString(); // ISO 8601 UTC
```

### 12. XSS Prevention
**Issue**: Malicious scripts in description fields.

**Handling**:
```typescript
export const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/[<>\"'`]/g, (char) => {
      const map = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;',
      };
      return map[char];
    });
};
```

### 13. Case-Insensitive Email
**Issue**: Different cases for same email.

**Handling**:
```typescript
const email = req.body.email.toLowerCase().trim();
```

### 14. Missing Authorization Header
**Issue**: Request without Bearer token.

**Handling**:
```typescript
export const authenticateToken = (req: AuthRequest, res: Response, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    throw new AuthenticationError('Authorization header required');
  }
};
```

### 15. Inactive User Access
**Issue**: Deleted/deactivated users still access system.

**Handling**:
```typescript
const result = await query(
  'SELECT * FROM users WHERE id = $1 AND is_active = true',
  [userId]
);
if (result.rows.length === 0) {
  throw new AuthenticationError('User account inactive');
}
```

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

HTTP Status Codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication failed)
- `403` - Forbidden (authorization failed)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Testing Edge Cases

### Manual Testing Checklist
- [ ] Register with invalid email
- [ ] Register with weak password
- [ ] Login with wrong password
- [ ] Create ticket with empty title
- [ ] Create ticket with 6000 char description
- [ ] Upload 50MB file
- [ ] Upload .exe file
- [ ] Update ticket created by different user
- [ ] Access other organization's data
- [ ] Multiple rapid login attempts
- [ ] Expired token usage
- [ ] Malicious script in ticket description

### Automated Testing
Run with test suite:
```bash
pnpm backend:test
```

---

## Security Checklist for Production

- [ ] Set strong `JWT_SECRET` (use `openssl rand -base64 32`)
- [ ] Enable HTTPS (required in production)
- [ ] Set `FRONTEND_URL` in CORS
- [ ] Configure proper database backups
- [ ] Enable request logging
- [ ] Monitor error rates
- [ ] Set up email alerts for critical errors
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Review rate limiting thresholds
- [ ] Test disaster recovery procedures
- [ ] Document incident response procedures

---

## Future Security Enhancements

1. **2FA/MFA**: Two-factor authentication for accounts
2. **OAuth**: Social login options
3. **CSRF Tokens**: Additional CSRF protection layer
4. **API Keys**: Long-lived tokens for integrations
5. **Audit Logging**: Detailed action logging per user
6. **IP Whitelisting**: For organization admin panel
7. **Data Encryption**: At-rest encryption for sensitive fields
8. **Webhook Signing**: HMAC signatures for webhooks
9. **API Rate Limiting per User**: Different limits per subscription tier
10. **Penetration Testing**: Regular security audits

