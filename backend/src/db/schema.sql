-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Organisations table
CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Organisation mapping with roles
CREATE TABLE IF NOT EXISTS user_organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, organisation_id)
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(100) DEFAULT 'To triage',
  assigned_to UUID REFERENCES users(id),
  -- GitHub integration columns
  github_issue_number INTEGER,
  github_issue_url VARCHAR(512),
  github_repo_owner VARCHAR(255),
  github_repo_name VARCHAR(255),
  github_issue_node_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Ticket attachments
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket activity log
CREATE TABLE IF NOT EXISTS ticket_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments table
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotent migrations for existing databases (adding columns if they don't exist)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS github_issue_number INTEGER;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS github_issue_url VARCHAR(512);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS github_repo_owner VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS github_repo_name VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS github_issue_node_id VARCHAR(255);

-- Update status check constraint to allow GitHub Projects statuses
DO $$
BEGIN
  ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
  ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (
    status IN (
      'To triage', 'Backlog', 'Ready', 'In progress', 'In review', 'Done',
      -- Legacy statuses kept for backwards compatibility
      'open', 'in_progress', 'in_verification', 'resolved', 'closed'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_user_organisations_user_id ON user_organisations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organisations_org_id ON user_organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tickets_organisation_id ON tickets(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON tickets(creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_github_node_id ON tickets(github_issue_node_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_id ON ticket_activity(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
