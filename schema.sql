-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    clerk_user_id TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    last_message_at BIGINT NOT NULL
);
-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    sources TEXT []
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_threads_clerk_user_id ON threads(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_message_at ON threads(last_message_at DESC);