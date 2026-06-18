# Project Folder Structure

## Root Level Organization

```
ticketing-system/
├── backend/                    # Express.js server and API
├── frontend/                   # React SPA client
├── docs/                       # Documentation files
├── docker-compose.yml          # Docker compose for local development
├── package.json                # Monorepo workspace configuration
├── tsconfig.json               # Root TypeScript configuration
└── README.md                   # Project overview
```

## Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── config/                 # Configuration utilities
│   ├── db/
│   │   ├── index.ts           # Database connection pool
│   │   └── schema.sql         # PostgreSQL schema definitions
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication middleware
│   ├── routes/                 # API endpoint handlers
│   │   ├── auth.ts            # Authentication endpoints
│   │   ├── organizations.ts    # Organization management
│   │   ├── tickets.ts         # Ticket CRUD operations
│   │   └── uploads.ts         # File upload handling
│   ├── services/               # Business logic layer
│   │   ├── authService.ts     # Authentication logic
│   │   ├── orgService.ts      # Organization operations
│   │   ├── ticketService.ts   # Ticket operations
│   │   ├── emailService.ts    # Email notifications
│   │   └── fileService.ts     # File handling
│   ├── utils/                  # Helper utilities
│   └── index.ts               # Server entry point
├── uploads/                    # File storage directory
├── .env.example               # Environment variable template
├── Dockerfile                 # Backend container configuration
├── package.json               # Backend dependencies
└── tsconfig.json              # Backend TypeScript config
```

### Backend Key Files

- **db/schema.sql**: Defines the complete PostgreSQL schema including tables for organizations, users, tickets, and attachments
- **middleware/auth.ts**: JWT token validation and user identification
- **services/**: Contains all business logic separated by domain (auth, org, ticket, email, files)
- **routes/**: Express route handlers that validate requests and delegate to services

## Frontend Structure (`frontend/`)

```
frontend/
├── public/                     # Static assets
│   ├── index.html            # Main HTML file
│   └── [images]              # Static images and icons
├── src/
│   ├── pages/                 # Page components
│   │   ├── LoginPage.tsx      # Login/authentication page
│   │   ├── RegisterPage.tsx   # User registration
│   │   ├── DashboardPage.tsx  # Main dashboard
│   │   ├── TicketsPage.tsx    # Ticket list view
│   │   ├── TicketDetailPage.tsx  # Individual ticket page
│   │   └── AdminMembersPage.tsx   # Member management
│   ├── components/            # Reusable UI components
│   ├── context/               # React Context providers
│   │   └── AuthContext.tsx    # Authentication state management
│   ├── services/              # API integration layer
│   │   └── api.ts            # Axios API client configuration
│   ├── styles/                # CSS stylesheets
│   │   ├── auth.css          # Authentication pages styling
│   │   ├── dashboard.css     # Dashboard styling
│   │   ├── tickets.css       # Tickets page styling
│   │   ├── ticket-detail.css # Ticket detail page styling
│   │   ├── admin.css         # Admin panel styling
│   │   └── index.css         # Global styles
│   ├── utils/                 # Helper utilities
│   ├── App.tsx               # Main app with routing
│   ├── index.tsx             # React entry point
│   └── index.css             # Global styles
├── Dockerfile                # Frontend container config
├── package.json              # Frontend dependencies
└── tsconfig.json             # Frontend TypeScript config
```

### Frontend Key Files

- **context/AuthContext.tsx**: Manages authentication state and user information across the app
- **services/api.ts**: Centralized API client with base URL, headers, and error handling
- **pages/**: Each page file represents a complete route/view in the application
- **styles/**: Organized CSS files, one per major page/feature

## Documentation Structure (`docs/`)

```
docs/
├── API.md                     # Detailed API endpoint documentation
├── ARCHITECTURE.md            # System design and architecture overview
├── SETUP.md                   # Installation and setup instructions
├── QUICK_START.md             # Quick reference for developers
└── FOLDER_STRUCTURE.md        # This file
```

## Key Principles

### Monorepo Workspace
- Root `package.json` uses pnpm workspaces to manage both `backend` and `frontend`
- Each subdirectory has its own `package.json` and `tsconfig.json`
- Install dependencies in each workspace with `pnpm install --recursive`

### Backend Organization
- **Separation of Concerns**: Database, middleware, routes, and services are clearly separated
- **Services Layer**: All business logic lives in services; routes are thin controllers
- **Database**: PostgreSQL schema is versioned in schema.sql and auto-initialized on startup

### Frontend Organization
- **Page-based Structure**: Pages directly map to routes
- **Context API**: Authentication state managed centrally via React Context
- **Services Layer**: API calls abstracted into a service module
- **Component-scoped Styles**: CSS files organized by feature/page

## Important Conventions

- **Backend**: TypeScript for type safety; all routes require authentication middleware
- **Frontend**: React with hooks; pages use context for global state
- **Database**: PostgreSQL with proper indexing and constraints
- **Environment**: Each service has a `.env.example` template
- **Docker**: Both services have Dockerfiles for containerized deployment
