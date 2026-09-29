-- ============================================================================
-- AjoClub / Ajo-Agent SQLite Schema
-- ============================================================================

-- 1. Circles (Ajo / Savings Clubs)
CREATE TABLE IF NOT EXISTS circles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_circle_id INTEGER,          -- Onchain clubId from AjoClub contract
    contract_address TEXT NOT NULL,       -- Base contract address
    name TEXT NOT NULL,
    token_address TEXT NOT NULL,          -- USDC or other ERC20 address
    token_symbol TEXT NOT NULL DEFAULT 'USDC',
    token_decimals INTEGER NOT NULL DEFAULT 6,
    contribution_amount TEXT NOT NULL,    -- Human or raw unit as string (e.g. '50.00' or '50000000')
    cycle_duration_seconds INTEGER NOT NULL,
    grace_period_seconds INTEGER NOT NULL,
    max_members INTEGER NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 0,
    cycle_end_timestamp INTEGER,          -- UNIX timestamp (seconds)
    status TEXT NOT NULL DEFAULT 'OPEN',  -- 'OPEN', 'ACTIVE', 'COMPLETE', 'CANCELLED'
    creator_address TEXT NOT NULL,
    telegram_chat_id TEXT,               -- Telegram group or DM chat ID
    created_at INTEGER NOT NULL,          -- UNIX timestamp (seconds)
    updated_at INTEGER NOT NULL           -- UNIX timestamp (seconds)
);

CREATE INDEX IF NOT EXISTS idx_circles_contract_id ON circles(contract_circle_id);
CREATE INDEX IF NOT EXISTS idx_circles_status ON circles(status);
CREATE INDEX IF NOT EXISTS idx_circles_chat_id ON circles(telegram_chat_id);

-- 2. Members of each circle
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    basename TEXT,                        -- e.g. 'vitalik.base.eth'
    telegram_user_id TEXT,               -- Telegram user ID for notifications
    telegram_username TEXT,              -- @handle
    payout_order INTEGER NOT NULL,        -- Round index when member gets the pot (0-indexed)
    has_paid_current_round INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
    total_contributed TEXT NOT NULL DEFAULT '0',
    total_received TEXT NOT NULL DEFAULT '0',
    status TEXT NOT NULL DEFAULT 'ACTIVE',-- 'ACTIVE', 'DEFAULTED', 'LEFT'
    joined_at INTEGER NOT NULL,
    UNIQUE(circle_id, wallet_address),
    UNIQUE(circle_id, payout_order)
);

CREATE INDEX IF NOT EXISTS idx_members_circle ON members(circle_id);
CREATE INDEX IF NOT EXISTS idx_members_wallet ON members(wallet_address);
CREATE INDEX IF NOT EXISTS idx_members_telegram ON members(telegram_user_id);

-- 3. Onchain Contributions
CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    member_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number INTEGER,
    timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contributions_circle_round ON contributions(circle_id, round);

-- 4. Payouts (Proposed & Executed)
CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    recipient_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'PROPOSED', -- 'PROPOSED', 'APPROVED', 'EXECUTED', 'REJECTED'
    proposed_by TEXT NOT NULL DEFAULT 'agent',
    approved_by TEXT,                        -- Telegram user ID or 'guardrail_auto'
    executed_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payouts_circle_round ON payouts(circle_id, round);

-- 5. Approval Requests (Human-in-the-Loop Gate for Layer 4 Guardrails)
CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,                     -- UUID string
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,               -- 'EXECUTE_PAYOUT', 'FLAG_DEFAULT', 'OVERRIDE_CAP'
    payload TEXT NOT NULL,                   -- JSON string of action details
    status TEXT NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
    requester TEXT NOT NULL DEFAULT 'agent',
    reviewer_telegram_id TEXT,
    telegram_message_id TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER,
    consumed_at INTEGER                      -- UNIX timestamp (seconds) when consumed/used for payout
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approval_requests(status);

-- 6. Audit Log (Immutable security record of all agent & guardrail events)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER REFERENCES circles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,                -- 'TOOL_CALL', 'GUARDRAIL_CHECK', 'APPROVAL_REQUESTED', 'TX_SUBMITTED', 'SECURITY_ALERT'
    actor TEXT NOT NULL,                     -- 'agent_llm', 'guardrail_engine', 'organizer', 'indexer'
    details TEXT NOT NULL,                   -- JSON string of contextual payload
    severity TEXT NOT NULL DEFAULT 'INFO',   -- 'INFO', 'WARN', 'CRITICAL'
    timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_circle ON audit_log(circle_id);

-- 7. Reminders (Prevents duplicate reminder spam)
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    member_address TEXT NOT NULL,
    telegram_user_id TEXT,
    reminder_type TEXT NOT NULL,             -- 'DUE_48H', 'DUE_24H', 'DUE_SOON', 'GRACE_PERIOD'
    sent_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_dedup ON reminders(circle_id, round, member_address, reminder_type);
