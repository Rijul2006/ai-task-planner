-- 1. Enable UUID Extension (PostgreSQL feature to generate unique IDs automatically)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom ENUM Types for Fixed Values
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE actor_type AS ENUM ('USER', 'AI_AGENT', 'SYSTEM');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'tool');
CREATE TYPE ai_action_status AS ENUM ('proposed', 'pending_approval', 'approved', 'rejected', 'executed', 'failed');

-- 3. Users Table (Stores account information)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Sessions Table (Stores user login sessions securely)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- 5. Boards Table (Kanban boards owned by users)
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_boards_owner_id ON boards (owner_id) WHERE archived_at IS NULL;

-- 6. Tasks Table (Core task management domain)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'TODO',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    due_date DATE,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_board_id ON tasks (board_id);
CREATE INDEX idx_tasks_assignee_id ON tasks (assignee_id);
CREATE INDEX idx_tasks_status ON tasks (board_id, status);
CREATE INDEX idx_tasks_due_date ON tasks (due_date) WHERE status != 'DONE';

-- 7. Task Dependencies Table (Task A blocks Task B)
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocking_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    blocked_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (blocking_task_id, blocked_task_id),
    CHECK (blocking_task_id != blocked_task_id)
);

CREATE INDEX idx_deps_blocking ON task_dependencies (blocking_task_id);
CREATE INDEX idx_deps_blocked ON task_dependencies (blocked_task_id);

-- 8. Task Activity Table (Append-only audit log for all mutations)
CREATE TABLE task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    actor_type actor_type NOT NULL,
    actor_id UUID REFERENCES users(id),
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_task_id ON task_activity (task_id, created_at DESC);

-- 9. AI Conversations & Messages (Chat history)
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conv_board ON ai_conversations (board_id, created_at DESC);

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT,
    tool_calls JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conv ON ai_messages (conversation_id, created_at);

-- 10. AI Recommendations (Proactive risk analysis persistence)
CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    risk_summary TEXT NOT NULL,
    evidence JSONB NOT NULL,
    recommendation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dismissed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_recs_board ON ai_recommendations (board_id) WHERE dismissed_at IS NULL;

-- 11. AI Actions (Human-in-the-loop approval state machine)
CREATE TABLE ai_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    tool_args JSONB NOT NULL,
    reason TEXT NOT NULL,
    status ai_action_status NOT NULL DEFAULT 'pending_approval',
    requested_by UUID REFERENCES users(id),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_actions_status ON ai_actions (status);
CREATE INDEX idx_ai_actions_task ON ai_actions (task_id);