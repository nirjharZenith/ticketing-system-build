# Quick Start Guide

Get the ticketing system running in minutes!

## Option 1: Docker (Easiest)

### Prerequisites
- Docker & Docker Compose installed

### Steps
```bash
# Start everything
docker-compose up

# Wait for services to initialize (2-3 minutes)
# Access frontend at http://localhost:3000
# Backend API at http://localhost:5000/api
```

**Database credentials (for reference):**
- User: ticketing_user
- Password: ticketing_password
- Database: ticketing_app
- Host: localhost:5432

---

## Option 2: Local Development

### Prerequisites
- Node.js 16+
- PostgreSQL 14+
- pnpm

### Step 1: Setup Database

If using Docker for just the database:
```bash
docker run --name ticketing_db \
  -e POSTGRES_USER=ticketing_user \
  -e POSTGRES_PASSWORD=ticketing_password \
  -e POSTGRES_DB=ticketing_app \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### Step 2: Setup Backend

```bash
cd backend

# Install dependencies
pnpm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://ticketing_user:ticketing_password@localhost:5432/ticketing_app
JWT_SECRET=your-secret-key-change-in-production
BACKEND_PORT=5000
NODE_ENV=development
EOF

# Start backend
pnpm dev
# Backend runs on http://localhost:5000
```

### Step 3: Setup Frontend (new terminal)

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000/api
EOF

# Start frontend
pnpm start
# Frontend runs on http://localhost:3000
```

---

## First Test Run

### 1. Register Account
1. Open http://localhost:3000
2. Click "Register here"
3. Fill in details:
   - Email: `test@example.com`
   - Name: `Test User`
   - Password: `TestPassword123!`
4. Click "Register"

### 2. Create Organization
1. Enter organization name: `Test Company`
2. Click "Create"

### 3. Create a Ticket
1. Click on the organization card
2. Click "+ Create Ticket"
3. Fill in:
   - Title: `First Test Ticket`
   - Description: `Testing the system`
   - Priority: `High`
4. Click "Create Ticket"

### 4. View & Update Ticket
1. Click on the ticket you created
2. See ticket details and activity
3. Click "Edit" on Status
4. Change status to "In Progress"
5. Click "Save"

### 5. Manage Members
1. Go back to tickets (← Back)
2. Click "👥 Members"
3. See yourself listed as Admin
4. Try inviting another member (enter an email)
5. Select role "User"
6. Click "Invite Member"

---

## Testing with Sample Data

### Create Multiple Tickets
Run these cURL commands (replace TOKEN with your JWT token from login response):

```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  | jq -r '.token')

# Create high priority ticket
curl -X POST http://localhost:5000/api/tickets/YOUR_ORG_ID/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Critical Bug",
    "description":"Database connection failing",
    "priority":"urgent"
  }'

# Create low priority ticket
curl -X POST http://localhost:5000/api/tickets/YOUR_ORG_ID/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"UI Enhancement",
    "description":"Improve button styling",
    "priority":"low"
  }'
```

---

## Useful Commands

### Backend

```bash
cd backend

# Development (with hot reload)
pnpm dev

# Production build
pnpm build

# Run production
NODE_ENV=production pnpm start

# TypeScript check
pnpm exec tsc --noEmit
```

### Frontend

```bash
cd frontend

# Development
pnpm start

# Production build
pnpm build

# Run tests
pnpm test
```

### Database

```bash
# Connect to database
psql postgresql://ticketing_user:ticketing_password@localhost/ticketing_app

# Useful commands
\dt                    # List tables
\d table_name          # Describe table
SELECT * FROM users;   # Query users
\q                     # Exit
```

---

## Common Issues

### Backend won't start
```bash
# Check database connection
psql postgresql://ticketing_user:ticketing_password@localhost/ticketing_app

# Check if port is in use
lsof -i :5000
```

### Frontend can't reach backend
```bash
# Verify backend is running
curl http://localhost:5000/api/health

# Check REACT_APP_API_URL in frontend/.env
cat frontend/.env
```

### Database already exists
```bash
# Drop and recreate (WARNING: removes all data!)
dropdb ticketing_app
createdb ticketing_app
```

### Port conflicts
- Change `BACKEND_PORT` in backend/.env (default: 5000)
- Change PORT for frontend: `PORT=3001 pnpm start`
- Change database port: `-p 5433:5432` in docker run

---

## Frontend Pages

### Public Pages
- `/login` - Login page
- `/register` - Registration page

### Protected Pages
- `/dashboard` - Organization selector
- `/org/:id/tickets` - Ticket list
- `/org/:id/tickets/:id` - Ticket details
- `/org/:id/members` - Member management (admin)

---

## API Quick Reference

```bash
# Auth
POST /api/auth/register          # Register
POST /api/auth/login             # Login
GET /api/auth/me                 # Get current user

# Organizations
POST /api/orgs                   # Create
GET /api/orgs                    # List

# Tickets
POST /api/tickets/{org}/tickets  # Create
GET /api/tickets/{org}/tickets   # List
PATCH /api/tickets/{org}/tickets/{id} # Update

# Members
GET /api/orgs/{org}/members      # List
POST /api/orgs/{org}/members     # Add
DELETE /api/orgs/{org}/members/{uid} # Remove
```

---

## Environment Setup Reference

### Backend .env
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
BACKEND_PORT=5000
NODE_ENV=development
```

### Frontend .env
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Stopping Services

### Docker
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: removes data!)
docker-compose down -v
```

### Local
- Backend: Press Ctrl+C in terminal
- Frontend: Press Ctrl+C in terminal
- Database: If Docker, run `docker stop ticketing_db`

---

## Next Steps

1. Review API_DOCUMENTATION.md for full API reference
2. Check SETUP.md for detailed configuration
3. Read PROJECT_SUMMARY.md for architecture overview
4. Explore codebase:
   - Backend: `backend/src/routes/` for API logic
   - Frontend: `frontend/src/pages/` for UI components

---

## Useful Resources

- [Express Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [JWT Introduction](https://jwt.io/introduction)

---

## Support

If you encounter issues:
1. Check error messages in terminal/console
2. Review SETUP.md troubleshooting section
3. Verify environment variables
4. Check database connection
5. Ensure all ports are available

---

**You're ready to go! Start with Option 1 (Docker) if new to the stack.**

Happy coding!
