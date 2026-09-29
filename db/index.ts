import { db } from "./client.js";
import {
  CircleRow,
  MemberRow,
  ContributionRow,
  PayoutRow,
  ApprovalRequestRow,
  AuditLogRow,
  ReminderRow,
  CircleStatus,
  ApprovalStatus,
  AuditEventType,
  AuditSeverity,
} from "./types.js";

export * from "./types.js";
export * from "./client.js";

// ============================================================================
// Circles Repository
// ============================================================================
export const circlesRepo = {
  create(circle: Omit<CircleRow, "id" | "created_at" | "updated_at">): CircleRow {
    const now = Math.floor(Date.now() / 1000);
    const result = db.run(
      `INSERT INTO circles (
        contract_circle_id, contract_address, name, token_address, token_symbol,
        token_decimals, contribution_amount, cycle_duration_seconds, grace_period_seconds,
        max_members, current_round, cycle_end_timestamp, status, creator_address,
        telegram_chat_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        circle.contract_circle_id,
        circle.contract_address,
        circle.name,
        circle.token_address,
        circle.token_symbol,
        circle.token_decimals,
        circle.contribution_amount,
        circle.cycle_duration_seconds,
        circle.grace_period_seconds,
        circle.max_members,
        circle.current_round,
        circle.cycle_end_timestamp,
        circle.status,
        circle.creator_address,
        circle.telegram_chat_id,
        now,
        now,
      ]
    );

    return db.get<CircleRow>(`SELECT * FROM circles WHERE id = ?`, [Number(result.lastInsertRowid)])!;
  },

  getById(id: number): CircleRow | undefined {
    return db.get<CircleRow>(`SELECT * FROM circles WHERE id = ?`, [id]);
  },

  getByContractCircleId(contractCircleId: number): CircleRow | undefined {
    return db.get<CircleRow>(`SELECT * FROM circles WHERE contract_circle_id = ?`, [contractCircleId]);
  },

  getByTelegramChatId(chatId: string): CircleRow[] {
    return db.query<CircleRow>(`SELECT * FROM circles WHERE telegram_chat_id = ?`, [chatId]);
  },

  getActive(): CircleRow[] {
    return db.query<CircleRow>(`SELECT * FROM circles WHERE status = 'ACTIVE'`);
  },

  getAll(): CircleRow[] {
    return db.query<CircleRow>(`SELECT * FROM circles ORDER BY id ASC`);
  },

  getByName(name: string): CircleRow | undefined {
    return db.get<CircleRow>(
      `SELECT * FROM circles WHERE lower(name) = lower(?) OR lower(name) LIKE lower(?) LIMIT 1`,
      [name, `%${name}%`]
    );
  },

  getByMemberTelegramUserId(telegramUserId: string): { circle: CircleRow; member: MemberRow }[] {
    return db.query<{ circle: CircleRow; member: MemberRow }>(
      `SELECT 
        c.id, c.contract_circle_id, c.contract_address, c.name, c.token_address, c.token_symbol,
        c.token_decimals, c.contribution_amount, c.cycle_duration_seconds, c.grace_period_seconds,
        c.max_members, c.current_round, c.cycle_end_timestamp, c.status, c.creator_address,
        c.telegram_chat_id, c.created_at, c.updated_at,
        m.id as member_id, m.wallet_address, m.basename, m.payout_order, m.has_paid_current_round,
        m.total_contributed, m.total_received
      FROM circles c
      JOIN members m ON c.id = m.circle_id
      WHERE m.telegram_user_id = ?
      ORDER BY c.id ASC`,
      [telegramUserId]
    ).map((row: any) => ({
      circle: {
        id: row.id,
        contract_circle_id: row.contract_circle_id,
        contract_address: row.contract_address,
        name: row.name,
        token_address: row.token_address,
        token_symbol: row.token_symbol,
        token_decimals: row.token_decimals,
        contribution_amount: row.contribution_amount,
        cycle_duration_seconds: row.cycle_duration_seconds,
        grace_period_seconds: row.grace_period_seconds,
        max_members: row.max_members,
        current_round: row.current_round,
        cycle_end_timestamp: row.cycle_end_timestamp,
        status: row.status,
        creator_address: row.creator_address,
        telegram_chat_id: row.telegram_chat_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      member: {
        id: row.member_id,
        circle_id: row.id,
        wallet_address: row.wallet_address,
        basename: row.basename,
        telegram_user_id: telegramUserId,
        telegram_username: null,
        payout_order: row.payout_order,
        has_paid_current_round: row.has_paid_current_round,
        total_contributed: row.total_contributed,
        total_received: row.total_received,
        status: "ACTIVE",
        joined_at: 0,
      },
    }));
  },

  updateStatus(id: number, status: CircleStatus): void {
    const now = Math.floor(Date.now() / 1000);
    db.run(`UPDATE circles SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);
  },

  updateCycle(id: number, currentRound: number, cycleEndTimestamp: number): void {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `UPDATE circles SET current_round = ?, cycle_end_timestamp = ?, updated_at = ? WHERE id = ?`,
      [currentRound, cycleEndTimestamp, now, id]
    );
  },
};

// ============================================================================
// Members Repository
// ============================================================================
export const membersRepo = {
  add(member: Omit<MemberRow, "id" | "joined_at">): MemberRow {
    const now = Math.floor(Date.now() / 1000);
    const result = db.run(
      `INSERT INTO members (
        circle_id, wallet_address, basename, telegram_user_id, telegram_username,
        payout_order, has_paid_current_round, total_contributed, total_received,
        status, joined_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        member.circle_id,
        member.wallet_address.toLowerCase(),
        member.basename,
        member.telegram_user_id,
        member.telegram_username,
        member.payout_order,
        member.has_paid_current_round,
        member.total_contributed,
        member.total_received,
        member.status,
        now,
      ]
    );

    return db.get<MemberRow>(`SELECT * FROM members WHERE id = ?`, [Number(result.lastInsertRowid)])!;
  },

  getByCircle(circleId: number): MemberRow[] {
    return db.query<MemberRow>(
      `SELECT * FROM members WHERE circle_id = ? ORDER BY payout_order ASC`,
      [circleId]
    );
  },

  getByWallet(circleId: number, wallet: string): MemberRow | undefined {
    return db.get<MemberRow>(
      `SELECT * FROM members WHERE circle_id = ? AND wallet_address = ?`,
      [circleId, wallet.toLowerCase()]
    );
  },

  getByWalletAcrossCircles(walletAddress: string): MemberRow[] {
    return db.query<MemberRow>(
      `SELECT * FROM members WHERE lower(wallet_address) = lower(?)`,
      [walletAddress.toLowerCase()]
    );
  },

  getByTelegramUserId(telegramUserId: string): MemberRow[] {
    return db.query<MemberRow>(
      `SELECT * FROM members WHERE telegram_user_id = ?`,
      [telegramUserId]
    );
  },

  linkTelegramUser(walletAddress: string, telegramUserId: string, telegramUsername?: string): number {
    const result = db.run(
      `UPDATE members SET telegram_user_id = ?, telegram_username = ? WHERE lower(wallet_address) = lower(?)`,
      [telegramUserId, telegramUsername || null, walletAddress.toLowerCase()]
    );
    return Number(result.changes);
  },

  linkWallet(
    walletAddress: string,
    telegramUserId: string,
    telegramUsername?: string
  ): {
    success: boolean;
    error?: "NOT_A_MEMBER" | "ALREADY_LINKED_TO_OTHER";
    message: string;
    circlesLinked?: number;
  } {
    const normalized = walletAddress.toLowerCase();
    const existing = this.getByWalletAcrossCircles(normalized);

    // Rule 1: Wallet must exist as a member in at least one circle
    if (existing.length === 0) {
      return {
        success: false,
        error: "NOT_A_MEMBER",
        message: `Address \`${walletAddress}\` is not enrolled in any circles. You must first be added as a circle member by an organizer before linking your Telegram account.`,
      };
    }

    // Rule 2: Cannot overwrite a link claimed by a different Telegram user
    const conflict = existing.find(
      (m) => m.telegram_user_id && m.telegram_user_id !== telegramUserId
    );
    if (conflict) {
      return {
        success: false,
        error: "ALREADY_LINKED_TO_OTHER",
        message: `Address \`${walletAddress}\` is already linked to another Telegram account. Overwriting an existing member link is not permitted.`,
      };
    }

    // Rule 3: Valid member - link across all circles where this wallet is enrolled
    const updated = this.linkTelegramUser(normalized, telegramUserId, telegramUsername);
    return {
      success: true,
      circlesLinked: updated,
      message: `Successfully linked \`${walletAddress}\` across ${updated} circle(s).`,
    };
  },

  markPaid(circleId: number, wallet: string, hasPaid: boolean): void {
    db.run(
      `UPDATE members SET has_paid_current_round = ? WHERE circle_id = ? AND wallet_address = ?`,
      [hasPaid ? 1 : 0, circleId, wallet.toLowerCase()]
    );
  },

  resetRoundPaymentStatus(circleId: number): void {
    db.run(`UPDATE members SET has_paid_current_round = 0 WHERE circle_id = ?`, [circleId]);
  },
};

// ============================================================================
// Contributions Repository
// ============================================================================
export const contributionsRepo = {
  record(contribution: Omit<ContributionRow, "id">): ContributionRow {
    const result = db.run(
      `INSERT INTO contributions (circle_id, round, member_address, amount, tx_hash, block_number, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        contribution.circle_id,
        contribution.round,
        contribution.member_address.toLowerCase(),
        contribution.amount,
        contribution.tx_hash,
        contribution.block_number,
        contribution.timestamp,
      ]
    );

    return db.get<ContributionRow>(`SELECT * FROM contributions WHERE id = ?`, [Number(result.lastInsertRowid)])!;
  },

  getByCircleAndRound(circleId: number, round: number): ContributionRow[] {
    return db.query<ContributionRow>(
      `SELECT * FROM contributions WHERE circle_id = ? AND round = ?`,
      [circleId, round]
    );
  },
};

// ============================================================================
// Payouts Repository
// ============================================================================
export const payoutsRepo = {
  propose(payout: Omit<PayoutRow, "id" | "created_at" | "executed_at" | "tx_hash">): PayoutRow {
    const now = Math.floor(Date.now() / 1000);
    const result = db.run(
      `INSERT INTO payouts (circle_id, round, recipient_address, amount, status, proposed_by, approved_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payout.circle_id,
        payout.round,
        payout.recipient_address.toLowerCase(),
        payout.amount,
        payout.status,
        payout.proposed_by,
        payout.approved_by,
        now,
      ]
    );

    return db.get<PayoutRow>(`SELECT * FROM payouts WHERE id = ?`, [Number(result.lastInsertRowid)])!;
  },

  markExecuted(id: number, txHash: string): void {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `UPDATE payouts SET status = 'EXECUTED', tx_hash = ?, executed_at = ? WHERE id = ?`,
      [txHash, now, id]
    );
  },
};

// ============================================================================
// Approval Requests Repository (Human-In-The-Loop)
// ============================================================================
export const approvalsRepo = {
  create(request: Omit<ApprovalRequestRow, "created_at" | "resolved_at">): ApprovalRequestRow {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO approval_requests (
        id, circle_id, action_type, payload, status, requester,
        reviewer_telegram_id, telegram_message_id, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.id,
        request.circle_id,
        request.action_type,
        request.payload,
        request.status,
        request.requester,
        request.reviewer_telegram_id,
        request.telegram_message_id,
        request.expires_at,
        now,
      ]
    );

    return db.get<ApprovalRequestRow>(`SELECT * FROM approval_requests WHERE id = ?`, [request.id])!;
  },

  getById(id: string): ApprovalRequestRow | undefined {
    return db.get<ApprovalRequestRow>(`SELECT * FROM approval_requests WHERE id = ?`, [id]);
  },

  resolve(id: string, status: ApprovalStatus, reviewerTelegramId?: string): void {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `UPDATE approval_requests SET status = ?, reviewer_telegram_id = ?, resolved_at = ? WHERE id = ?`,
      [status, reviewerTelegramId || null, now, id]
    );
  },

  markConsumed(id: string): void {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `UPDATE approval_requests SET consumed_at = ? WHERE id = ?`,
      [now, id]
    );
  },
};

// ============================================================================
// Audit Log Repository
// ============================================================================
export const auditRepo = {
  log(
    eventType: AuditEventType,
    actor: string,
    details: Record<string, unknown>,
    circleId?: number,
    severity: AuditSeverity = "INFO"
  ): AuditLogRow {
    const now = Math.floor(Date.now() / 1000);
    const result = db.run(
      `INSERT INTO audit_log (circle_id, event_type, actor, details, severity, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [circleId || null, eventType, actor, JSON.stringify(details), severity, now]
    );

    return db.get<AuditLogRow>(`SELECT * FROM audit_log WHERE id = ?`, [Number(result.lastInsertRowid)])!;
  },

  getRecent(limit: number = 50): AuditLogRow[] {
    return db.query<AuditLogRow>(`SELECT * FROM audit_log ORDER BY id DESC LIMIT ?`, [limit]);
  },
};

// ============================================================================
// Reminders Repository
// ============================================================================
export const remindersRepo = {
  hasSent(circleId: number, round: number, memberAddress: string, reminderType: string): boolean {
    const row = db.get<{ count: number }>(
      `SELECT count(*) as count FROM reminders
       WHERE circle_id = ? AND round = ? AND member_address = ? AND reminder_type = ?`,
      [circleId, round, memberAddress.toLowerCase(), reminderType]
    );
    return (row?.count ?? 0) > 0;
  },

  record(circleId: number, round: number, memberAddress: string, reminderType: string, telegramUserId?: string): void {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO reminders (circle_id, round, member_address, telegram_user_id, reminder_type, sent_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [circleId, round, memberAddress.toLowerCase(), telegramUserId || null, reminderType, now]
    );
  },
};
