-- ==============================================================================
-- KIBO360 Project Hub — Production PostgreSQL Database Initialization
-- Livexpert Technologies Pvt. Ltd.
-- Mounted to /docker-entrypoint-initdb.d/ in PostgreSQL container
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create unprivileged application service user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'kibo360_app') THEN

      CREATE ROLE kibo360_app WITH LOGIN PASSWORD 'LivexpertProd2026SecureApp!';
   END IF;
END
$do$;

-- 3. Grant schema permissions
GRANT CONNECT ON DATABASE kibo360_hub TO kibo360_app;
GRANT USAGE, CREATE ON SCHEMA public TO kibo360_app;

-- 4. Set Default Table and Sequence Permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kibo360_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kibo360_app;

-- 5. Production Tuning Settings
ALTER SYSTEM SET max_connections = '100';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET random_page_cost = '1.1';
ALTER SYSTEM SET effective_io_concurrency = '200';
ALTER SYSTEM SET work_mem = '2621kB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';
