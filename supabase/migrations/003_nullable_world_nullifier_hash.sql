-- Migration 003: Make world_nullifier_hash nullable
-- Use world_wallet_address as the primary unique identifier for users.
-- Nullifier hash is no longer generated (moved from ZK proof approach to SIWE wallet auth).

ALTER TABLE users ALTER COLUMN world_nullifier_hash DROP NOT NULL;
