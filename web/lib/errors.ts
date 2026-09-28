export function friendlyError(err: Error): string {
  const msg = err.message ?? "";

  if (/user rejected|user denied|cancelled/i.test(msg))
    return "Transaction cancelled.";
  if (/insufficient funds|insufficient balance/i.test(msg))
    return "Insufficient balance to complete this transaction.";
  if (/Contribution must be > 0/i.test(msg))
    return "Contribution amount must be greater than zero.";
  if (/Token not allowed/i.test(msg))
    return "This token is not supported.";
  if (/Need at least 2 members/i.test(msg))
    return "A club needs at least 2 members.";
  if (/Transfer failed/i.test(msg))
    return "Token transfer failed. Check your balance and allowance.";
  if (/Already paid/i.test(msg))
    return "You have already contributed this cycle.";
  if (/Cycle has ended/i.test(msg))
    return "This cycle has already ended.";
  if (/Not a member/i.test(msg))
    return "You are not a member of this club.";
  if (/Must be Self-verified/i.test(msg))
    return "You need to verify your identity before joining.";
  if (/revert/i.test(msg)) {
    // Extract the revert reason if present
    const match = msg.match(/reverted.*?reason:\s*(.+?)(\n|$)/i);
    if (match) return match[1].trim();
    return "Transaction reverted. Please try again.";
  }

  // Fallback — first line only, stripped of technical prefix
  return msg.split("\n")[0].replace(/^(Error|ContractFunctionRevertedError|TransactionExecutionError):\s*/i, "") || "Transaction failed.";
}
