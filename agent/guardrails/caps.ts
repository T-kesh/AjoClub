// ============================================================================
// Layer 4 Guardrail: Caps Engine (caps.ts)
// Pure deterministic validation - NO LLM dependency
// ============================================================================

export interface CircleCapConstraints {
  minContributionUsdc: number; // 1.00 USDC
  maxContributionUsdc: number; // 1,000.00 USDC
  maxTotalPotUsdc: number;     // 10,000.00 USDC
  minMembers: number;          // 2 members
  maxMembers: number;          // 30 members
  minCycleSeconds: number;     // 1 hour
  maxCycleSeconds: number;     // 365 days
  minGraceSeconds: number;     // 1 hour
  maxGraceSeconds: number;     // 14 days
}

export const DEFAULT_CAPS: CircleCapConstraints = {
  minContributionUsdc: 1.0,
  maxContributionUsdc: 1000.0,
  maxTotalPotUsdc: 10000.0,
  minMembers: 2,
  maxMembers: 30,
  minCycleSeconds: 3600,            // 1 hour
  maxCycleSeconds: 365 * 24 * 3600, // 365 days
  minGraceSeconds: 3600,            // 1 hour
  maxGraceSeconds: 14 * 24 * 3600,  // 14 days
};

export interface CapValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates circle parameters against strict financial and structural bounds.
 * Prevents prompt-injected or malfunctioning agents from creating runaway circles.
 */
export function validateCircleCaps(
  contributionAmountFormatted: number,
  maxMembers: number,
  cycleDurationSeconds: number,
  gracePeriodSeconds: number,
  caps: CircleCapConstraints = DEFAULT_CAPS
): CapValidationResult {
  if (contributionAmountFormatted < caps.minContributionUsdc) {
    return {
      valid: false,
      reason: `Contribution ${contributionAmountFormatted} USDC is below minimum ${caps.minContributionUsdc} USDC`,
    };
  }

  if (contributionAmountFormatted > caps.maxContributionUsdc) {
    return {
      valid: false,
      reason: `Contribution ${contributionAmountFormatted} USDC exceeds maximum cap of ${caps.maxContributionUsdc} USDC`,
    };
  }

  if (maxMembers < caps.minMembers || maxMembers > caps.maxMembers) {
    return {
      valid: false,
      reason: `Member count ${maxMembers} must be between ${caps.minMembers} and ${caps.maxMembers}`,
    };
  }

  const potSize = contributionAmountFormatted * maxMembers;
  if (potSize > caps.maxTotalPotUsdc) {
    return {
      valid: false,
      reason: `Total pot ${potSize} USDC exceeds circle pot safety limit of ${caps.maxTotalPotUsdc} USDC`,
    };
  }

  if (cycleDurationSeconds < caps.minCycleSeconds || cycleDurationSeconds > caps.maxCycleSeconds) {
    return {
      valid: false,
      reason: `Cycle duration ${cycleDurationSeconds}s outside allowed range [${caps.minCycleSeconds}s, ${caps.maxCycleSeconds}s]`,
    };
  }

  if (gracePeriodSeconds < caps.minGraceSeconds || gracePeriodSeconds > caps.maxGraceSeconds) {
    return {
      valid: false,
      reason: `Grace period ${gracePeriodSeconds}s outside allowed range [${caps.minGraceSeconds}s, ${caps.maxGraceSeconds}s]`,
    };
  }

  return { valid: true };
}
