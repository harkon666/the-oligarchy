-- Add migration script here
CREATE SCHEMA IF NOT EXISTS oligarchy;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS oligarchy.users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    balance NUMERIC(78, 0) NOT NULL DEFAULT 0, -- uint256 can be large
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexer_state table
CREATE TABLE IF NOT EXISTS oligarchy.indexer_state (
    id INT PRIMARY KEY DEFAULT 1,
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1) -- Ensure only one row exists
);

-- Insert initial state if not exists
INSERT INTO oligarchy.indexer_state (id, last_processed_block)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
