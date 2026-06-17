# AjoClub Changelog

## [1.0.0] — 2026-06-17

### Deployed
- **Frontend** live at https://react-app-psi-ten-23.vercel.app
- **AjoClub contract** live on Celo mainnet at `0x95cB4aA0b634D02E218B2ae2b85B464007c3457c`
- Verified on [Celoscan](https://celoscan.io/address/0x95cB4aA0b634D02E218B2ae2b85B464007c3457c#code)
- Deployer: `0xE12D94Db1d6afD6127c072246D8b0a65a5306C8D`

### Smart Contract
- `AjoClub.sol` — core rotating savings contract with round-robin payout
- Inherits `SelfVerificationRoot` from `@selfxyz/contracts` for passport-based identity gating
- Registers `VerificationConfigV2` atomically in constructor via `IdentityVerificationHubV2`
- Supports cUSD, cEUR, cKES (Mento stablecoins) on Celo mainnet
- 15/15 tests passing — full lifecycle including edge cases

### Frontend
- Next.js 14 (App Router) MiniPay Mini App
- wagmi v2 + viem — all write calls use `type: "legacy"` for MiniPay compatibility
- Pages: Home, Create Club, Browse Clubs, Club Dashboard, Contribute, Verify
- Auto-connects MiniPay wallet on load via `useMiniPay` hook
- ERC20 approve + contribute two-step flow with allowance pre-check (skips approve if sufficient)
- `ClubCreated` event decoded from receipt to redirect to correct `/club/[id]` after creation
- Chain guard blocks UI if wallet is on wrong network
- Self Protocol QR verification widget with inline error feedback

### Fixed
- Mobile number input prepend-zero bug (Max Members field)
- Clubs listing now shows OPEN clubs immediately (was only showing ACTIVE)
- Refetch waits for TX confirmation before re-reading contract state
- Hydration mismatch on home page fixed with mounted guard
- Safe BigInt URL param parsing with error boundary
