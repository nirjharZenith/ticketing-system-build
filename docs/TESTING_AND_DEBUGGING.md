# Testing & Debugging Guide

## Backend Testing

### Manual API Testing with cURL

#### Authentication Tests

```bash
# 1. Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'

# Expected: 201 Created
# Response: { "success": true, "user": {...} }

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Expected: 200 OK
# Response: { "success": true, "user": {...}, "token": "..." }

# 3. Get current user (using token)
TOKEN="your_jwt_token_here"
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# Response: { "success": true, "user": {...} }
```

#### Organization Tests

```bash
TOKEN="your_jwt_token_here"

# 1. Create organization
curl -X POST http://localhost:5000/api/orgs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Company"
  }'

# Expected: 201 Created
# Response: { "success": true, "org": {...} }

# 2. Get organization
ORG_ID="org_uuid_here"
curl -X GET http://localhost:5000/api/orgs/$ORG_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# Response: { "success": true, "org": {...} }
```

#### Ticket Tests

```bash
TOKEN="your_jwt_token_here"
ORG_ID="org_uuid_here"

# 1. Create ticket
curl -X POST http://localhost:5000/api/tickets/$ORG_ID/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Bug in login page",
    "description": "Users cannot login with special characters in password",
    "priority": "high"
  }'

# Expected: 201 Created
# Response: { "success": true, "ticket": {...} }

# 2. List tickets
curl -X GET "http://localhost:5000/api/tickets/$ORG_ID/tickets?status=open&priority=high" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# Response: { "success": true, "tickets": [...] }

# 3. Get single ticket
TICKET_ID="ticket_uuid_here"
curl -X GET http://localhost:5000/api/tickets/$ORG_ID/tickets/$TICKET_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# Response: { "success": true, "ticket": {...} }

# 4. Update ticket
curl -X PATCH http://localhost:5000/api/tickets/$ORG_ID/tickets/$TICKET_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "in_progress",
    "priority": "critical"
  }'

# Expected: 200 OK
# Response: { "success": true, "ticket": {...} }
```

### Edge Case Testing

#### Test Invalid Input

```bash
# Invalid email
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "name": "Test",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'
# Expected: 400 Bad Request - "Invalid email format"

# Weak password
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test",
    "password": "weak",
    "confirmPassword": "weak"
  }'
# Expected: 400 Bad Request - "Password must be at least 8 characters..."

# Empty title
TOKEN="your_jwt_token_here"
ORG_ID="org_uuid_here"
curl -X POST http://localhost:5000/api/tickets/$ORG_ID/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "",
    "description": "Some description"
  }'
# Expected: 400 Bad Request - "Title must be between 3 and 200 characters"

# Very long description
curl -X POST http://localhost:5000/api/tickets/$ORG_ID/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Valid Title",
    "description": "'"$(printf 'x%.0s' {1..6000})"'"
  }'
# Expected: 400 Bad Request - "Description must not exceed 5000 characters"
```

#### Test Authorization

```bash
TOKEN="user1_token"
ORG_ID="org_user2_created"

# Try to access other user's organization
curl -X GET http://localhost:5000/api/orgs/$ORG_ID \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden - "Access denied"
```

#### Test Rate Limiting

```bash
# Make 6 rapid login attempts
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPassword123!"
    }'
  echo "Request $i"
done

# 6th request should get 429 Too Many Requests
# Response headers should include:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: <seconds>
```

### Debugging Tools

#### Enable Debug Logging

```bash
# Backend
NODE_ENV=development pnpm backend:dev

# Will show detailed logs like:
# [v0] 201 POST /api/auth/register 234ms
# [v0] 200 GET /api/orgs/uuid 45ms
```

#### Check Backend Health

```bash
curl http://localhost:5000/api/health

# Response:
{
  "status": "ok",
  "metrics": {
    "uptime": 123456,
    "timestamp": "2024-01-15T10:30:00Z",
    "requestCount": 234,
    "errorCount": 2,
    "averageResponseTime": 45
  }
}
```

#### View Request Logs

The backend maintains request logs in memory:

```typescript
// In browser console or via API endpoint you create:
import { getRequestLogs, getErrorMetrics } from './middleware/logger';

console.log(getRequestLogs());      // All requests
console.log(getErrorMetrics());     // Error breakdown
```

---

## Frontend Testing

### Manual Testing

#### Test Authentication Flow

1. Navigate to http://localhost:3000
2. Click "Register"
3. Fill form with valid data
4. Verify success message
5. Login with credentials
6. Should redirect to dashboard

#### Test Organization Creation

1. After login, click "Create Organization"
2. Enter organization name
3. Verify redirects to organization tickets page
4. Verify org appears in sidebar

#### Test Ticket Creation

1. In organization, click "Create Ticket"
2. Fill title, description, priority
3. Attach a file (optional)
4. Submit
5. Verify ticket appears in list
6. Check email received (if configured)

#### Test Ticket Updates

1. Click on a ticket
2. Change status to "in_progress"
3. Change priority to "critical"
4. Assign to team member
5. Verify changes saved
6. Check activity log

### Frontend Error Testing

#### Test Invalid Input

```javascript
// In browser console, manually trigger API calls:

const api = new API('http://localhost:5000');

// Invalid email
await api.register({
  email: 'invalid',
  name: 'Test',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!'
});
// Should show validation error

// Weak password
await api.register({
  email: 'test@example.com',
  name: 'Test',
  password: 'weak',
  confirmPassword: 'weak'
});
// Should show error about password requirements
```

#### Test Network Error Handling

1. Open DevTools Network tab
2. Set throttling to "Offline"
3. Try to create ticket
4. Should show error: "Network error. Please try again."
5. Set throttling to "Fast 3G"
6. Try again
7. Should eventually succeed or timeout appropriately

#### Test Authentication Errors

1. Login successfully
2. Open DevTools Console
3. Clear localStorage to remove token
4. Refresh page
5. Should redirect to login
6. Try accessing /dashboard directly
7. Should redirect to login

### Frontend Edge Cases

#### Test Session Timeout

1. Login
2. Leave browser idle for > 24 hours (or manually edit token expiry in localStorage)
3. Try to make request
4. Should show: "Session expired, please login again"
5. Redirects to login page

#### Test Large File Upload

1. Create ticket
2. Try uploading 50MB file
3. Should show: "File too large. Max size is 10MB"
4. Try uploading .exe file
5. Should show: "File type not allowed"
6. Upload valid PDF
7. Should succeed

#### Test Concurrent Requests

1. Open multiple tabs
2. Create ticket in tab 1
3. Create ticket in tab 2 simultaneously
4. Both should succeed
5. Refresh tab 3
6. Should show both tickets

---

## Automated Testing

### Backend Unit Tests

```bash
pnpm backend:test
```

### Backend Integration Tests

```bash
pnpm backend:test:integration
```

### Frontend Component Tests

```bash
pnpm frontend:test
```

### End-to-End Tests

```bash
pnpm test:e2e
```

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution**: 
```bash
# Check DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check if Neon is accessible
ping db.neon.tech
```

### Issue: "Email service not working"
**Solution**:
```bash
# Check if SMTP config is set in .env
echo $SMTP_HOST
echo $SMTP_USER

# Test email (in development, check Ethereal preview):
# Go to: https://ethereal.email
# Check preview URL in email service logs

# In production, verify SendGrid config
```

### Issue: "Token validation fails"
**Solution**:
```bash
# Ensure JWT_SECRET is set
echo $JWT_SECRET

# Never change JWT_SECRET after deployment (invalidates all tokens)
# If changed, all users must re-login

# Check token expiry
# Tokens expire after 24h by default
```

### Issue: "File upload not working"
**Solution**:
```bash
# Check uploads directory exists
ls -la backend/uploads/

# Check file permissions
chmod 755 backend/uploads/

# Check file size limit in .env
echo $MAX_FILE_SIZE

# Verify MIME type validation
```

### Issue: "Rate limiting too strict"
**Solution**:
```typescript
// Adjust limits in backend/src/middleware/rateLimiter.ts
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5, // Increase this if needed
});
```

---

## Performance Testing

### Load Testing

```bash
# Install ab (Apache Bench)
sudo apt-get install apache2-utils

# Test GET endpoint
ab -n 1000 -c 100 http://localhost:5000/api/health

# Test POST endpoint
ab -n 100 -c 10 -T application/json -p data.json http://localhost:5000/api/tickets/{org_id}/tickets
```

### Response Time Monitoring

```bash
# Check average response time
curl http://localhost:5000/api/health | jq '.metrics.averageResponseTime'

# Should be < 100ms for healthy system
```

---

## Error Monitoring

### Check Error Rate

```bash
# Backend logs all errors with metrics
# Access via health endpoint
curl http://localhost:5000/api/health | jq '.metrics.errorCount'

# If errorCount > 10, investigate:
# 1. Check backend logs
# 2. Review recent changes
# 3. Check database connectivity
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `VALIDATION_ERROR` | Invalid input | Fix input data |
| `AUTHENTICATION_ERROR` | Login failed | Check credentials |
| `AUTHORIZATION_ERROR` | No permission | Check user role |
| `NOT_FOUND` | Resource missing | Verify ID is correct |
| `DUPLICATE_ENTRY` | Already exists | Use different value |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `TOKEN_EXPIRED` | Session expired | Login again |
| `INTERNAL_ERROR` | Server error | Check logs |

---

## Debugging Workflow

1. **Identify**: Check error message and error code
2. **Locate**: Find where error originates in code
3. **Isolate**: Reproduce issue in minimal example
4. **Test**: Add console.log statements
5. **Fix**: Implement solution
6. **Verify**: Test fix with multiple scenarios
7. **Clean**: Remove debug logs

### Example Debug Session

```typescript
// In backend/src/routes/tickets.ts
router.post('/:org_id/tickets', ..., async (req, res, next) => {
  console.log('[v0] Request body:', req.body);           // Debug: see input
  console.log('[v0] Org ID:', req.params.org_id);        // Debug: see params
  console.log('[v0] User:', req.user?.id);                // Debug: see user
  
  try {
    const validationErrors = validateTicketCreation(req.body);
    console.log('[v0] Validation errors:', validationErrors); // Debug: see errors
    
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors);
    }
    
    const ticket = await ticketService.createTicket(...);
    console.log('[v0] Created ticket:', ticket);         // Debug: see result
    
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error('[v0] Error creating ticket:', error);  // Debug: see error
    next(error);
  }
});

// After confirming fix works, remove debug logs
```

