import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Initialize PostgreSQL Connection Pool using DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ,
});

// Export helper query function used across services
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Auto-heal database schema on server startup
export const initializeDatabaseSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE board_role AS ENUM ('OWNER', 'MEMBER', 'VIEWER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS board_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role board_role NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS board_members_board_user_unique
      ON board_members (board_id, user_id);
    `);

    await client.query(`
      INSERT INTO board_members (board_id, user_id, role)
      SELECT id, owner_id, 'OWNER'::board_role
      FROM boards
      ON CONFLICT (board_id, user_id) DO UPDATE SET role = 'OWNER';
    `);

    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await client.query(`
      ALTER TABLE boards ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await client.query(`
      ALTER TABLE task_activity ALTER COLUMN task_id DROP NOT NULL;
    `);

    await client.query(`
      DO $$ DECLARE constraint_name TEXT;
      BEGIN
        FOR constraint_name IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'task_activity'::regclass
            AND contype = 'f'
            AND confrelid = 'tasks'::regclass
        LOOP
          EXECUTE format('ALTER TABLE task_activity DROP CONSTRAINT %I', constraint_name);
        END LOOP;
      END $$;
    `);

    await client.query(`
      ALTER TABLE task_activity
      ADD CONSTRAINT task_activity_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL schema verified: RBAC, board memberships, and audit history are ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;