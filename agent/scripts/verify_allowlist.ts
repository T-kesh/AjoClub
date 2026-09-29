import "dotenv/config";
import { isContractTargetAllowed } from "../guardrails/allowlist.js";
import assert from "node:assert/strict";

const deployedAddress = "0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3";

console.log("🔍 Checking allowlist against newly deployed AjoClub address...");
console.log("Configured AJO_CLUB_CONTRACT_ADDRESS:", process.env.AJO_CLUB_CONTRACT_ADDRESS);

// 1. Must be allowed for the exact deployed address on Base Sepolia
const isAllowedExact = isContractTargetAllowed(deployedAddress, 84532);
assert.equal(isAllowedExact, true, "Exact deployed address must be ALLOWED");
console.log("✅ Exact deployed address allowed:           ", isAllowedExact);

// 2. Must be allowed for lowercase variation
const isAllowedLower = isContractTargetAllowed(deployedAddress.toLowerCase(), 84532);
assert.equal(isAllowedLower, true, "Lowercase deployed address must be ALLOWED");
console.log("✅ Lowercase deployed address allowed:        ", isAllowedLower);

// 3. Must be allowed for uppercase variation
const isAllowedUpper = isContractTargetAllowed(deployedAddress.toUpperCase(), 84532);
assert.equal(isAllowedUpper, true, "Uppercase deployed address must be ALLOWED");
console.log("✅ Uppercase deployed address allowed:        ", isAllowedUpper);

// 4. Must REJECT an arbitrary address (not allowlisted)
const arbitrary = "0x1111111111111111111111111111111111111111";
const isAllowedArbitrary = isContractTargetAllowed(arbitrary, 84532);
assert.equal(isAllowedArbitrary, false, "Arbitrary address must be REJECTED");
console.log("✅ Non-allowlisted arbitrary address rejected:", !isAllowedArbitrary);

// 5. Must REJECT zero address
const zero = "0x0000000000000000000000000000000000000000";
const isAllowedZero = isContractTargetAllowed(zero, 84532);
assert.equal(isAllowedZero, false, "Zero address must be REJECTED");
console.log("✅ Zero address rejected:                    ", !isAllowedZero);

console.log("\n🎉 ALLOWLIST GUARDRAIL VERIFICATION PASSED: Contract opens ONLY for the deployed address!");
