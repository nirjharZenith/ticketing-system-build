# Development Guide

## Workspace Commands

### Install & Update
```bash
# Install all dependencies (backend + frontend)
pnpm install --recursive

# Install in specific workspace
pnpm --filter backend install
pnpm --filter frontend install

# Update dependencies
pnpm --filter backend update
pnpm --filter frontend update
```

### Development Mode
```bash
# Run all services in dev mode
pnpm dev

# Run specific service
pnpm backend:dev
pnpm frontend:dev
```

### Building
```bash
# Build all services
pnpm build

# Build specific service
pnpm backend:build
pnpm frontend:build
```

### Production Start
```bash
# Start all services
pnpm start

# Start specific service
pnpm backend:start
pnpm frontend:start
```

## Backend Development

### Project Structure
```
backend/src/
├── config/        # Application configuration
├── db/           # Database setup & queries
├── middleware/   # Express middleware (auth, error handling)
├── routes/       # API endpoint definitions
├── services/     # Business logic & data operations
└── utils/        # Helper functions
```

### Database

#### Schema Initialization
The database schema is auto-initialized when the backend starts. To manually initialize:

```sql
-- Connect to your database and run schema.sql contents
psql -U postgres -d ticketing_app -f backend/src/db/schema.sql
```

#### Core Tables
1. **organisations** - Multi-tenant organizations
2. **users** - User accounts with hashed passwords
3. **user_organisations** - Membership join table with roles
4. **tickets** - Support tickets with status tracking
5. **ticket_attachments** - File references for tickets

### Adding a New API Endpoint

1. **Create route handler** (`backend/src/routes/`)
   ```typescript
   router.post('/new-endpoint', authenticateToken, async (req, res) => {
     // Route logic
   });
   ```

2. **Add service function** (`backend/src/services/`)
   ```typescript
   export async function businessLogic(param: string) {
     // Business logic
   }
   ```

3. **Call from route**
   ```typescript
   const result = await service.businessLogic(req.body.param);
   res.json(result);
   ```

4. **Register route** (`backend/src/index.ts`)
   ```typescript
   app.use('/api/endpoint', newRoutes);
   ```

### Authentication Flow

1. User provides credentials to `/api/auth/register` or `/api/auth/login`
2. Backend validates and returns JWT token
3. Frontend stores token in memory/localStorage
4. Middleware validates token on each protected route
5. User ID extracted from token and stored in `req.user`

### Email Service

Configure in `.env`:
```env
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
```

Send emails:
```typescript
await emailService.sendTicketCreatedEmail(
  recipientEmail,
  ticketTitle,
  ticketId,
  creatorName
);
```

### File Uploads

Files uploaded via `/api/uploads` are stored in `backend/uploads/` and served at `/uploads/{filename}`.

## Frontend Development

### Project Structure
```
frontend/src/
├── pages/      # Page components (one per route)
├── components/ # Reusable UI components
├── context/    # React Context providers
├── services/   # API integration
├── styles/     # CSS stylesheets
└── utils/      # Helper functions
```

### State Management

#### Authentication Context
```typescript
// Access anywhere in the app
const { user, login, logout, isAuthenticated } = useAuth();

// Context provides:
// - user: Current user object
// - isAuthenticated: Boolean flag
// - login/logout: Functions to manage auth state
// - organizations: Available orgs for user
```

#### API Data Fetching
```typescript
import useSWR from 'swr';

const { data, error, loading } = useSWR(
  '/api/tickets',
  (url) => api.get(url).then(r => r.data)
);
```

### Creating a New Page

1. **Create page file** (`frontend/src/pages/NewPage.tsx`)
   ```typescript
   export default function NewPage() {
     const { user } = useAuth();
     
     return (
       <div className="page-container">
         {/* Page content */}
       </div>
     );
   }
   ```

2. **Create styles** (`frontend/src/styles/new-page.css`)
   ```css
   .page-container {
     padding: 20px;
   }
   ```

3. **Add route** (`frontend/src/App.tsx`)
   ```typescript
   <Route path="/new-page" element={<NewPage />} />
   ```

4. **Add navigation link**
   ```typescript
   <Link to="/new-page">New Page</Link>
   ```

### API Integration

Access API through service:
```typescript
import api from '../services/api';

// GET request
const response = await api.get('/api/tickets');

// POST request
const response = await api.post('/api/tickets', {
  title: 'New Ticket',
  description: 'Description here'
});

// PATCH request
const response = await api.patch('/api/tickets/123', {
  status: 'resolved'
});

// File upload
const formData = new FormData();
formData.append('file', file);
const response = await api.post('/api/uploads', formData);
```

### Form Handling

Basic form pattern:
```typescript
const [formData, setFormData] = useState({ title: '', description: '' });
const [loading, setLoading] = useState(false);

const handleChange = (e) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await api.post('/api/tickets', formData);
    // Success
  } catch (error) {
    // Error handling
  } finally {
    setLoading(false);
  }
};
```

## Docker Development

### Local Development with Docker

Start all services:
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

Stop services:
```bash
docker-compose down
```

Rebuild containers:
```bash
docker-compose up -d --build
```

## Environment Variables

### Backend `.env`
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ticketing_app
JWT_SECRET=your-secret-key
BACKEND_PORT=5000
NODE_ENV=development

# Optional
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-email@ethereal.email
SMTP_PASSWORD=your-password
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000
```

## Debugging

### Backend Debugging
```typescript
console.log('[v0] Message:', variable);
// Check backend logs during development
```

### Frontend Debugging
- Use browser DevTools (F12)
- React DevTools browser extension
- Network tab to inspect API calls
- Console for errors and logs

### Database Debugging
```bash
# Connect to database
psql -U postgres -d ticketing_app

# Run queries
SELECT * FROM tickets;
SELECT * FROM users;
```

## Performance Optimization

### Backend
- Add database indexes for frequently queried columns
- Use connection pooling (already configured)
- Implement pagination for large result sets
- Cache responses when appropriate

### Frontend
- Lazy load routes: `const Page = lazy(() => import('./pages/Page'));`
- Optimize images and assets
- Use SWR for efficient data fetching
- Monitor bundle size with `pnpm --filter frontend build --analyze`

## Version Control

### Branch Naming
- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`

### Commit Messages
```
feat: Add user authentication
fix: Resolve ticket update issue
docs: Update API documentation
```

## Useful npm Scripts

```bash
# Backend
pnpm --filter backend dev      # Start dev server
pnpm --filter backend build    # Build TypeScript
pnpm --filter backend start    # Start production

# Frontend
pnpm --filter frontend dev     # Start dev server
pnpm --filter frontend build   # Build production bundle
pnpm --filter frontend start   # Preview production build

# Workspace
pnpm install --recursive       # Install all deps
pnpm dev                       # Run all services in dev
pnpm build                     # Build all services
```

## Getting Help

1. Check documentation in `docs/` folder
2. Review API documentation in `docs/API.md`
3. Check architecture in `docs/ARCHITECTURE.md`
4. Review similar existing code
5. Check error logs and console output
