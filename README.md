# Ticketing System

A full-stack ticketing application with user authentication, organization management, and ticket tracking capabilities.

## Project Structure

```
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── db/               # Database connection and schema
│   │   ├── middleware/       # Auth and other middleware
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   └── index.ts          # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── context/          # React context providers
│   │   ├── services/         # API service layer
│   │   ├── styles/           # CSS files
│   │   ├── App.tsx           # Main app component
│   │   └── index.tsx         # Entry point
│   ├── public/               # Static assets
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Features

### Authentication
- User registration and login
- JWT-based authentication
- Protected routes and API endpoints

### Organization Management
- Create and manage organizations
- Add members to organizations
- Role-based access control (admin, user)

### Ticket Management
- Create, read, update, and delete tickets
- Assign tickets to team members
- Set priority levels (low, medium, high, urgent)
- Track ticket status (open, in_progress, resolved, closed)
- Activity logging for audit trails
- File attachments support

### Security
- Password hashing with bcryptjs
- JWT token-based authentication
- Role-based authorization
- IDOR protection through organization membership verification

## Setup

### Quick Start (from project root)

```bash
# Install dependencies
pnpm --dir backend install
pnpm --dir frontend install

# Run backend (port 5000) and frontend (port 3000) in separate terminals
pnpm dev:backend
pnpm dev:frontend

# Run all backend tests
pnpm test
```

### Prerequisites
- Node.js 16+
- PostgreSQL database (Neon)
- pnpm or npm

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ticketing_app
JWT_SECRET=your-secret-key-here
BACKEND_PORT=5000
NODE_ENV=development
```

4. Run database migrations (schema is auto-initialized):
```bash
pnpm dev
```

The backend will start on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
pnpm start
```

The frontend will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify` - Verify token

### Organizations
- `GET /api/orgs` - Get user's organizations
- `POST /api/orgs` - Create organization
- `GET /api/orgs/:org_id/members` - Get organization members
- `POST /api/orgs/:org_id/members` - Add member to organization
- `DELETE /api/orgs/:org_id/members/:user_id` - Remove member from organization

### Tickets
- `POST /api/tickets/:org_id/tickets` - Create ticket
- `GET /api/tickets/:org_id/tickets` - Get organization tickets
- `GET /api/tickets/:org_id/tickets/:ticket_id` - Get single ticket
- `PATCH /api/tickets/:org_id/tickets/:ticket_id` - Update ticket
- `DELETE /api/tickets/:org_id/tickets/:ticket_id` - Delete ticket
- `GET /api/tickets/:org_id/tickets/:ticket_id/activity` - Get ticket activity
- `GET /api/tickets/:org_id/tickets/:ticket_id/attachments` - Get attachments
- `POST /api/tickets/:org_id/tickets/:ticket_id/attachments` - Add attachment

## Database Schema

### Users Table
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique email
- `name` (VARCHAR) - User name
- `password_hash` (VARCHAR) - Hashed password
- `is_active` (BOOLEAN) - Account active status
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Update timestamp
- `deleted_at` (TIMESTAMP) - Soft delete timestamp

### Organizations Table
- `id` (UUID) - Primary key
- `name` (VARCHAR) - Organization name
- `slug` (VARCHAR) - URL slug
- `created_by` (UUID) - Creator user ID
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Update timestamp

### User Organizations Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Reference to users
- `organisation_id` (UUID) - Reference to organisations
- `role` (VARCHAR) - Admin or User role
- `created_at` (TIMESTAMP) - Creation timestamp

### Tickets Table
- `id` (UUID) - Primary key
- `organisation_id` (UUID) - Reference to organisation
- `creator_id` (UUID) - Reference to creator user
- `title` (VARCHAR) - Ticket title
- `description` (TEXT) - Ticket description
- `priority` (VARCHAR) - Priority level
- `status` (VARCHAR) - Current status
- `assigned_to` (UUID) - Assigned user reference
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Update timestamp
- `resolved_at` (TIMESTAMP) - Resolution timestamp

### Ticket Attachments Table
- `id` (UUID) - Primary key
- `ticket_id` (UUID) - Reference to ticket
- `filename` (VARCHAR) - File name
- `file_url` (VARCHAR) - File URL
- `uploaded_by` (UUID) - Uploader user ID
- `created_at` (TIMESTAMP) - Upload timestamp

### Ticket Activity Table
- `id` (UUID) - Primary key
- `ticket_id` (UUID) - Reference to ticket
- `user_id` (UUID) - Reference to user
- `action` (VARCHAR) - Action type
- `old_value` (TEXT) - Previous value
- `new_value` (TEXT) - New value
- `created_at` (TIMESTAMP) - Timestamp

## User Flows

### 1. Registration & Login
- New users can register with email, name, and password
- Existing users can log in with email and password
- JWT token stored in localStorage for session persistence

### 2. Organization Management
- Users can create organizations and automatically become admins
- Admins can invite other users to their organization
- Organization members can view and manage tickets

### 3. Ticket Lifecycle
1. User creates a ticket with title, description, and priority
2. Ticket is assigned a unique ID and tracked
3. Tickets can be updated (status, priority, assignment)
4. All changes are logged with user information
5. Tickets can be resolved or closed
6. Users can attach files to tickets
7. Activity history shows all changes

## Development

### Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
BACKEND_PORT=5000
NODE_ENV=development
```

**Frontend** (`.env`):
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Building for Production

**Backend**:
```bash
cd backend
pnpm build
pnpm start
```

**Frontend**:
```bash
cd frontend
pnpm build
```

## Security Considerations

1. **Password Security**: Passwords are hashed using bcryptjs with 10 salt rounds
2. **Authentication**: JWT tokens with 24-hour expiration
3. **Authorization**: Role-based checks for sensitive operations
4. **IDOR Protection**: All ticket operations verify organization membership
5. **SQL Injection**: Using parameterized queries with pg library
6. **CORS**: Enabled to allow frontend-backend communication

## Error Handling

The application includes comprehensive error handling:
- Input validation on all endpoints
- Meaningful error messages
- Proper HTTP status codes
- Try-catch blocks for database operations

## Future Enhancements

- File storage integration (S3, Blob)
- Email notifications on ticket updates
- Advanced filtering and search
- Ticket categories/tags
- Real-time updates with WebSockets
- Comment system for collaboration
- Ticket templates
- Analytics dashboard
