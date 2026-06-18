# Setup Guide - Ticketing System

This guide walks you through setting up the ticketing system locally.

## Prerequisites

- Node.js 16 or higher
- PostgreSQL 14 or higher (or use Neon for PostgreSQL hosting)
- pnpm (or npm/yarn)
- Docker & Docker Compose (optional, for containerized setup)

## Option 1: Local Development Setup

### Step 1: Setup PostgreSQL Database

If you don't have PostgreSQL installed locally:

**Using Docker:**
```bash
docker run --name ticketing_db \
  -e POSTGRES_USER=ticketing_user \
  -e POSTGRES_PASSWORD=ticketing_password \
  -e POSTGRES_DB=ticketing_app \
  -p 5432:5432 \
  -d postgres:16-alpine
```

**Or use Neon (Recommended):**
1. Visit [neon.tech](https://neon.tech)
2. Create a free account
3. Create a new PostgreSQL database
4. Copy the connection string

### Step 2: Setup Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file:
```env
DATABASE_URL=postgresql://ticketing_user:ticketing_password@localhost:5432/ticketing_app
JWT_SECRET=your-secret-key-change-in-production
BACKEND_PORT=5000
NODE_ENV=development
```

If using Neon:
```env
DATABASE_URL=postgresql://user:password@your-neon-database.neon.tech/ticketing_app?sslmode=require
JWT_SECRET=your-secret-key-change-in-production
BACKEND_PORT=5000
NODE_ENV=development
```

4. Start the backend:
```bash
pnpm dev
```

The backend will start on `http://localhost:5000` and automatically initialize the database schema.

### Step 3: Setup Frontend

1. In a new terminal, navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the frontend:
```bash
pnpm start
```

The frontend will start on `http://localhost:3000`

## Option 2: Docker Compose Setup

1. From the root directory, ensure you have the correct environment:

2. Start all services:
```bash
docker-compose up
```

The services will be available at:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Database: `localhost:5432`

To stop the services:
```bash
docker-compose down
```

## Testing the Application

### 1. Create an Account

1. Open `http://localhost:3000` in your browser
2. Click "Register here" on the login page
3. Fill in your email, name, and password
4. Click "Register"

### 2. Create an Organization

1. After login, you'll see the dashboard
2. Enter an organization name in the "Create Organization" section
3. Click "Create"

### 3. Create a Ticket

1. Click on an organization card to view its tickets
2. Click "+ Create Ticket"
3. Fill in the ticket details:
   - Title (required)
   - Description (optional)
   - Priority (Low/Medium/High/Urgent)
4. Click "Create Ticket"

### 4. Manage Tickets

1. Click on a ticket to view its details
2. You can:
   - Update the status (Open/In Progress/Resolved/Closed)
   - View the activity history
   - See creation and update timestamps

## Environment Variables

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/db` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `BACKEND_PORT` | Port for backend server | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` |

## Building for Production

### Backend

```bash
cd backend

# Build TypeScript
pnpm build

# Start production server
NODE_ENV=production pnpm start
```

### Frontend

```bash
cd frontend

# Build React app
pnpm build

# The 'build' folder is ready to be deployed
```

## Troubleshooting

### Backend won't start

1. Check database connection:
```bash
psql postgresql://ticketing_user:ticketing_password@localhost/ticketing_app
```

2. Ensure all environment variables are set:
```bash
cat backend/.env
```

3. Check logs for detailed errors:
```bash
pnpm dev 2>&1 | tee debug.log
```

### Frontend can't connect to backend

1. Verify backend is running:
```bash
curl http://localhost:5000/api/health
```

2. Check REACT_APP_API_URL in frontend/.env matches backend URL

3. Check browser console for CORS errors

### Database connection errors

If using PostgreSQL locally:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Or for Docker
docker ps | grep postgres
```

### Port already in use

To use different ports, update the .env files:

Backend: Change `BACKEND_PORT`
Frontend: Change port in package.json scripts or use PORT=3001 npm start

## Database Management

### View database tables

```bash
psql postgresql://ticketing_user:ticketing_password@localhost/ticketing_app

# List tables
\dt

# View schema
\d table_name

# Exit
\q
```

### Reset database (⚠️ WARNING: This deletes all data!)

```bash
# Using psql
dropdb ticketing_app
createdb ticketing_app

# Then restart the backend to reinitialize schema
```

## Development Tips

### Frontend

- Hot Module Replacement (HMR) is enabled by default
- Changes to files are reflected immediately in the browser
- Open browser console for error messages

### Backend

- TypeScript is compiled on the fly with ts-node
- Changes require restart (use `nodemon` for auto-restart)
- Check console logs for debugging

### Database

- The schema is automatically initialized on first backend startup
- To modify schema, edit `/backend/src/db/schema.sql`
- Restart backend to apply changes

## Next Steps

- [ ] Test user registration and login
- [ ] Create an organization
- [ ] Create and manage tickets
- [ ] Try different priority and status levels
- [ ] Review activity history
- [ ] Deploy to production (Vercel, Heroku, etc.)

## Support

For issues or questions:
1. Check the browser console for errors
2. Review backend logs
3. Verify environment variables
4. Check database connection
5. Review the README.md for API documentation

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Introduction](https://jwt.io/introduction)
- [Docker Documentation](https://docs.docker.com/)
