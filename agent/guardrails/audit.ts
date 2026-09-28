// ============================================================================
// Layer 4 Guardrail: Audit Logger (audit.ts)
// Immutable structured logging of every agent action and guardrail decision
// ============================================================================

import { auditRepo, AuditLogRow, AuditEventType, AuditSeverity } from "../../db/index.js";

export function recordAuditLog(
  eventType: AuditEventType,
  actor: "agent_llm" | "guardrail_engine" | "organizer" | "indexer" | "system",
  details: Record<string, unknown>,
  circleId?: number,
  severity: AuditSeverity = "INFO"
): AuditLogRow {
  const entry = auditRepo.log(eventType, actor, details, circleId, severity);
  
  const prefix = severity === "CRITICAL" ? "🚨" : severity === "WARN" ? "⚠️" : "📝";
  console.log(`${prefix} [AUDIT:${eventType}] [${actor}] Circle:${circleId ?? "global"} - ${JSON.stringify(details)}`);

  return entry;
}
