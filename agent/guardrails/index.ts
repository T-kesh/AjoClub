// ============================================================================
// Layer 4: Guardrail Engine Exports
// ============================================================================

export * from "./caps.js";
export * from "./allowlist.js";
export * from "./rate_limits.js";
export * from "./approvals.js";
export * from "./audit.js";

import { validateCircleCaps } from "./caps.js";
import { isTokenAllowed, isContractTargetAllowed } from "./allowlist.js";
import { checkReminderRateLimit, checkToolCallRateLimit } from "./rate_limits.js";
import {
  validatePayoutPrerequisites,
  requiresHumanApproval,
  createPayoutApprovalRequest,
  verifyApprovalForExecution,
} from "./approvals.js";
import { recordAuditLog } from "./audit.js";

export const GuardrailEngine = {
  validateCaps: validateCircleCaps,
  isTokenAllowed,
  isContractTargetAllowed,
  checkReminderRateLimit,
  checkToolCallRateLimit,
  validatePayoutPrerequisites,
  requiresHumanApproval,
  createPayoutApprovalRequest,
  verifyApprovalForExecution,
  audit: recordAuditLog,
};
