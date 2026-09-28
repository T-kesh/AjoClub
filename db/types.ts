export type CircleStatus = 'OPEN' | 'ACTIVE' | 'COMPLETE' | 'CANCELLED';
export type MemberStatus = 'ACTIVE' | 'DEFAULTED' | 'LEFT';
export type PayoutStatus = 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'REJECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type ActionType = 'EXECUTE_PAYOUT' | 'FLAG_DEFAULT' | 'OVERRIDE_CAP';
export type AuditEventType = 'TOOL_CALL' | 'GUARDRAIL_CHECK' | 'APPROVAL_REQUESTED' | 'TX_SUBMITTED' | 'SECURITY_ALERT';
export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';
export type ReminderType = 'DUE_48H' | 'DUE_24H' | 'DUE_SOON' | 'GRACE_PERIOD';

export interface CircleRow {
  id: number;
  contract_circle_id: number | null;
  contract_address: string;
  name: string;
  token_address: string;
  token_symbol: string;
  token_decimals: number;
  contribution_amount: string;
  cycle_duration_seconds: number;
  grace_period_seconds: number;
  max_members: number;
  current_round: number;
  cycle_end_timestamp: number | null;
  status: CircleStatus;
  creator_address: string;
  telegram_chat_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface MemberRow {
  id: number;
  circle_id: number;
  wallet_address: string;
  basename: string | null;
  telegram_user_id: string | null;
  telegram_username: string | null;
  payout_order: number;
  has_paid_current_round: number; // 0 or 1
  total_contributed: string;
  total_received: string;
  status: MemberStatus;
  joined_at: number;
}

export interface ContributionRow {
  id: number;
  circle_id: number;
  round: number;
  member_address: string;
  amount: string;
  tx_hash: string;
  block_number: number | null;
  timestamp: number;
}

export interface PayoutRow {
  id: number;
  circle_id: number;
  round: number;
  recipient_address: string;
  amount: string;
  tx_hash: string | null;
  status: PayoutStatus;
  proposed_by: string;
  approved_by: string | null;
  executed_at: number | null;
  created_at: number;
}

export interface ApprovalRequestRow {
  id: string; // UUID
  circle_id: number;
  action_type: ActionType;
  payload: string; // JSON string
  status: ApprovalStatus;
  requester: string;
  reviewer_telegram_id: string | null;
  telegram_message_id: string | null;
  expires_at: number;
  created_at: number;
  resolved_at: number | null;
}

export interface AuditLogRow {
  id: number;
  circle_id: number | null;
  event_type: AuditEventType;
  actor: string;
  details: string; // JSON string
  severity: AuditSeverity;
  timestamp: number;
}

export interface ReminderRow {
  id: number;
  circle_id: number;
  round: number;
  member_address: string;
  telegram_user_id: string | null;
  reminder_type: ReminderType;
  sent_at: number;
}
