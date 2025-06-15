```postgresql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS password_reset_requests;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS client_attachments;
DROP TABLE IF EXISTS communications_log;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;

-- Create the "users" table
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    last_login_at TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create the "clients" table
CREATE TABLE clients (
    client_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    property_location TEXT,
    property_type TEXT,
    budget_range TEXT,
    additional_preferences TEXT,
    status TEXT NOT NULL,
    last_contact_date TEXT,
    next_follow_up_date TEXT,
    assigned_agent_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (assigned_agent_id) REFERENCES users(user_id)
);

-- Create the "communications_log" table
CREATE TABLE communications_log (
    log_id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    communication_date TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Create the "client_attachments" table
CREATE TABLE client_attachments (
    attachment_id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Create the "activity_log" table
CREATE TABLE activity_log (
    activity_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT,
    action_type TEXT NOT NULL,
    action_details TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- Create the "password_reset_requests" table
CREATE TABLE password_reset_requests (
    request_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reset_token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create additional indexes for performance
CREATE INDEX idx_clients_assigned_agent_id ON clients(assigned_agent_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_communications_log_client_id ON communications_log(client_id);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp);


-- Seed Data for "users" table
INSERT INTO users (user_id, name, email, password_hash, role, last_login_at, is_active, created_at, updated_at) VALUES
  ('user1', 'Alice Agent', 'alice.agent@example.com', 'hash_alice', 'agent', '2023-10-10T12:00:00Z', TRUE, '2023-10-01T09:00:00Z', '2023-10-01T09:00:00Z'),
  ('user2', 'Bob Agent', 'bob.agent@example.com', 'hash_bob', 'agent', '2023-10-11T08:30:00Z', TRUE, '2023-10-01T09:05:00Z', '2023-10-01T09:05:00Z'),
  ('user3', 'Charlie Manager', 'charlie.manager@example.com', 'hash_charlie', 'manager', '2023-10-12T10:20:00Z', TRUE, '2023-10-01T09:10:00Z', '2023-10-01T09:10:00Z'),
  ('user4', 'Diana Manager', 'diana.manager@example.com', 'hash_diana', 'manager', NULL, TRUE, '2023-10-01T09:15:00Z', '2023-10-01T09:15:00Z'),
  ('user5', 'Eve Agent', 'eve.agent@example.com', 'hash_eve', 'agent', '2023-10-13T14:00:00Z', TRUE, '2023-10-01T09:20:00Z', '2023-10-01T09:20:00Z');

-- Seed Data for "clients" table
INSERT INTO clients (client_id, full_name, phone, email, property_location, property_type, budget_range, additional_preferences, status, last_contact_date, next_follow_up_date, assigned_agent_id, notes, created_at, updated_at, deleted_at) VALUES
  ('client1', 'John Doe', '1112223333', 'john.doe@example.com', 'New York', 'residential', '$300k-$500k', 'Needs a backyard', 'new', '2023-10-05T15:30:00Z', '2023-10-20T15:30:00Z', 'user1', 'Interested in modern homes', '2023-10-05T15:00:00Z', '2023-10-05T15:00:00Z', NULL),
  ('client2', 'Jane Smith', '4445556666', 'jane.smith@example.com', 'Los Angeles', 'commercial', '$1M-$2M', 'Open to new constructions', 'in-progress', '2023-10-06T12:00:00Z', '2023-10-19T12:00:00Z', 'user2', 'Follow up regarding office space', '2023-10-06T11:45:00Z', '2023-10-06T11:45:00Z', NULL),
  ('client3', 'Robert Brown', '7778889999', 'robert.brown@example.com', 'Chicago', 'residential', '$500k-$700k', 'Prefers quiet neighborhoods', 'new', '2023-10-07T09:30:00Z', '2023-10-17T09:30:00Z', 'user5', 'First inquiry', '2023-10-07T09:00:00Z', '2023-10-07T09:00:00Z', NULL),
  ('client4', 'Emily Davis', '1231231234', '