# Contributing Guide

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 12
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ticketing-system
   ```

2. **Install dependencies**
   ```bash
   pnpm install --recursive
   ```

3. **Configure environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Edit .env with API endpoint
   ```

4. **Initialize database**
   ```bash
   # Backend will auto-initialize on first run, or manually:
   pnpm --filter backend run init-db
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   pnpm --filter backend dev
   
   # Terminal 2: Frontend
   pnpm --filter frontend dev
   ```

## Project Architecture

### Backend Stack
- **Framework**: Express.js
- **Database**: PostgreSQL with pg driver
- **Authentication**: JWT tokens
- **Validation**: Manual validation in routes
- **Email**: Nodemailer
- **File Storage**: Local filesystem with multer

### Frontend Stack
- **Framework**: React 19
- **Routing**: React Router v7
- **State Management**: React Context + SWR
- **HTTP Client**: Axios
- **Styling**: CSS (BEM convention)

## Code Standards

### Backend
- Place all TypeScript files in `src/` directory
- Use services layer for business logic
- All routes require authentication unless specified
- Database queries use parameterized queries for security
- Error messages should be descriptive but safe

### Frontend
- Functional components with hooks only
- Use React Context for global state
- Organize imports: React → Libraries → Local modules
- Use semantic HTML and ARIA attributes
- CSS class naming: `component-name__element--modifier`

## Database Conventions

### Schema Rules
- Use snake_case for column names
- Always include timestamps: `created_at`, `updated_at`
- Use UUIDs for primary keys
- Add appropriate indexes for performance
- Use constraints: NOT NULL, UNIQUE, FOREIGN KEY
- Soft deletes: `is_active` boolean field

### Common Tables
- `organisations`: Multi-tenant organizations
- `users`: System users
- `user_organisations`: Join table with roles
- `tickets`: Support tickets
- `ticket_attachments`: File attachments

## API Design

### Endpoint Structure
- **GET** `/api/{resource}` - List resources
- **POST** `/api/{resource}` - Create resource
- **GET** `/api/{resource}/:id` - Get single resource
- **PATCH** `/api/{resource}/:id` - Update resource
- **DELETE** `/api/{resource}/:id` - Delete resource

### Response Format
```json
{
  "data": {},
  "error": null,
  "status": 200
}
```

### Error Handling
- 400: Bad request (validation error)
- 401: Unauthorized
- 403: Forbidden (insufficient permissions)
- 404: Not found
- 500: Server error

## Security Practices

### Backend
- Always validate user input
- Check organization membership before operations
- Use prepared statements to prevent SQL injection
- Verify JWT tokens on all protected routes
- Hash passwords with bcrypt
- Use HTTPS in production

### Frontend
- Store JWT in HttpOnly cookie when possible
- Never store sensitive data in localStorage
- Validate user permissions before rendering UI
- Use CORS-safe API calls
- Sanitize user input before display

## Testing Guidelines

### What to Test
- API endpoint behavior (happy path and errors)
- Authentication and authorization
- Database operations
- Business logic in services
- Form validation and submission

### Running Tests
```bash
# Backend tests (when implemented)
pnpm --filter backend test

# Frontend tests (when implemented)
pnpm --filter frontend test
```

## Deployment

### Backend Deployment
1. Ensure all environment variables are set
2. Build: `pnpm --filter backend build`
3. Deploy to Node.js hosting (Heroku, Railway, Vercel, etc.)
4. Run database migrations

### Frontend Deployment
1. Build: `pnpm --filter frontend build`
2. Deploy to static hosting (Vercel, Netlify, GitHub Pages, etc.)
3. Set API endpoint environment variable

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# Stop services
docker-compose down
```

## Common Tasks

### Adding a New API Endpoint
1. Define the route in `backend/src/routes/`
2. Add business logic in appropriate service
3. Add middleware/auth as needed
4. Create corresponding frontend API call in `frontend/src/services/api.ts`
5. Create UI to consume the endpoint

### Adding a New Page
1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Create corresponding styles in `frontend/src/styles/`
4. Add navigation links to relevant pages

### Modifying Database Schema
1. Update `backend/src/db/schema.sql`
2. Test schema changes locally
3. Run migrations on production
4. Update corresponding service files

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is set correctly
- Ensure PostgreSQL is running
- Check port 5000 isn't in use
- Review `.env` file for missing variables

### Frontend API calls failing
- Verify backend is running on correct port
- Check REACT_APP_API_URL environment variable
- Review browser console for CORS errors
- Check authentication token is valid

### Database migrations failed
- Verify PostgreSQL version compatibility
- Check schema.sql for syntax errors
- Ensure database user has proper permissions
- Review migration logs

## Performance Considerations

### Backend
- Add indexes to frequently queried columns
- Use connection pooling (already configured)
- Cache repeated database queries
- Implement pagination for list endpoints
- Monitor query performance

### Frontend
- Lazy load routes with React.lazy()
- Implement code splitting
- Use SWR for efficient data fetching
- Optimize bundle size
- Cache API responses appropriately

## Questions?

Refer to the documentation in the `docs/` folder or check the README for more information.
