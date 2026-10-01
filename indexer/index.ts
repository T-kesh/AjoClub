// ============================================================================
// Layer 5 / Indexer: AjoClub On-Chain Event Indexer (Base Sepolia)
// Continuously monitors smart contract events, enforces idempotency,
// backfills history, and keeps SQLite in sync as the source of truth.
// ============================================================================

import {
  decodeEventLog,
  parseAbi,
  Log,
  formatUnits,
  Hex,
} from "viem";
import dotenv from "dotenv";
import { publicClient, AJO_CLUB_ABI } from "../agent/chain.js";
import {
  db,
  circlesRepo,
  membersRepo,
  contributionsRepo,
  payoutsRepo,
  indexerRepo,
  CircleStatus,
} from "../db/index.js";
import { sendTelegramNotification } from "../bot/notifications.js";

dotenv.config();

export const DEPLOYMENT_BLOCK_BASE_SEPOLIA = 47469082n;
const CHUNK_SIZE = 999n; // Base Sepolia public RPC limits eth_getLogs to 1,000 blocks
const DEFAULT_POLL_INTERVAL_MS = 4000;

export const AJO_CLUB_EVENTS_ABI = parseAbi([
  "event ClubCreated(uint256 indexed clubId, address indexed creator, string name, address token, uint256 contribution)",
  "event MemberJoined(uint256 indexed clubId, address indexed member)",
  "event ContributionMade(uint256 indexed clubId, address indexed member, uint256 round)",
  "event PayoutSent(uint256 indexed clubId, address indexed recipient, uint256 amount, uint256 round)",
  "event ClubComplete(uint256 indexed clubId)",
  "event MemberDefaulted(uint256 indexed clubId, address indexed member, uint256 round)",
  "event ClubCancelled(uint256 indexed clubId, address indexed cancelledBy)",
  "event MemberLeft(uint256 indexed clubId, address indexed member)",
  "event TokenAllowed(address indexed token, bool allowed)",
]);

export interface IndexerOptions {
  contractAddress?: `0x${string}`;
  startBlock?: bigint;
  pollIntervalMs?: number;
  silent?: boolean;
}

export class AjoClubIndexer {
  private contractAddress: `0x${string}`;
  private startBlock: bigint;
  private pollIntervalMs: number;
  private isRunning: boolean = false;
  private pollTimeout: NodeJS.Timeout | null = null;
  private lastSyncedBlock: bigint = 0n;

  constructor(options: IndexerOptions = {}) {
    const envAddr = process.env.AJO_CLUB_CONTRACT_ADDRESS;
    this.contractAddress = (options.contractAddress || envAddr || "0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3") as `0x${string}`;
    this.startBlock = options.startBlock ?? DEPLOYMENT_BLOCK_BASE_SEPOLIA;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  public getContractAddress(): `0x${string}` {
    return this.contractAddress;
  }

  public getLastSyncedBlock(): bigint {
    return this.lastSyncedBlock;
  }

  /**
   * Initializes state and executes initial historical backfill.
   */
  public async init(): Promise<{ startBlock: bigint; currentBlock: bigint; backfilledLogs: number }> {
    console.log("==================================================");
    console.log("📡 AjoClub On-Chain Event Indexer — Base Sepolia");
    console.log("==================================================");
    console.log(`🔗 RPC Target:       ${process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"}`);
    console.log(`📜 Contract Target:  ${this.contractAddress}`);

    // Read stored progress or default to deployment block
    const storedLastBlock = indexerRepo.getLastBlock();
    if (storedLastBlock && storedLastBlock > this.startBlock) {
      this.lastSyncedBlock = storedLastBlock;
      console.log(`💾 Resuming from Stored Block: ${this.lastSyncedBlock}`);
    } else {
      this.lastSyncedBlock = this.startBlock;
      console.log(`📦 Starting Fresh Backfill from: ${this.lastSyncedBlock}`);
    }

    const currentBlock = await publicClient.getBlockNumber();
    console.log(`⛓️  Current Chain Head:         ${currentBlock}`);
    console.log("==================================================");

    let totalBackfilled = 0;
    if (this.lastSyncedBlock < currentBlock) {
      console.log(`⏳ Backfilling blocks ${this.lastSyncedBlock} -> ${currentBlock}...`);
      totalBackfilled = await this.syncRange(this.lastSyncedBlock, currentBlock, true);
      this.lastSyncedBlock = currentBlock;
      indexerRepo.setLastBlock(this.lastSyncedBlock);
      console.log(`✅ Backfill complete! Processed ${totalBackfilled} historical events.`);
    } else {
      console.log("✅ Already caught up to chain head. No backfill needed.");
    }

    return {
      startBlock: this.startBlock,
      currentBlock,
      backfilledLogs: totalBackfilled,
    };
  }

  /**
   * Starts the continuous live polling loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`🚀 Live watcher started (polling every ${this.pollIntervalMs / 1000}s)`);

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        const headBlock = await publicClient.getBlockNumber();
        if (headBlock > this.lastSyncedBlock) {
          const from = this.lastSyncedBlock + 1n;
          await this.syncRange(from, headBlock, false);
          this.lastSyncedBlock = headBlock;
          indexerRepo.setLastBlock(this.lastSyncedBlock);
        }
      } catch (err: any) {
        console.warn(`⚠️ [INDEXER POLL ERROR] ${err?.message || err}`);
      } finally {
        if (this.isRunning) {
          this.pollTimeout = setTimeout(poll, this.pollIntervalMs);
        }
      }
    };

    this.pollTimeout = setTimeout(poll, this.pollIntervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    console.log("🛑 Indexer stopped.");
  }

  /**
   * Syncs a block range in chunks <= 999 blocks to respect RPC constraints,
   * querying in concurrent batches for high throughput while sorting logs
   * to guarantee strictly chronological event processing.
   */
  public async syncRange(fromBlock: bigint, toBlock: bigint, isBackfill: boolean = false): Promise<number> {
    let totalLogsProcessed = 0;

    const ranges: { from: bigint; to: bigint }[] = [];
    for (let currentFrom = fromBlock; currentFrom <= toBlock; currentFrom += CHUNK_SIZE + 1n) {
      const currentTo = currentFrom + CHUNK_SIZE > toBlock ? toBlock : currentFrom + CHUNK_SIZE;
      ranges.push({ from: currentFrom, to: currentTo });
    }

    const BATCH_SIZE = 5;
    for (let i = 0; i < ranges.length; i += BATCH_SIZE) {
      const batch = ranges.slice(i, i + BATCH_SIZE);
      const progressPercent = Math.round(((i + batch.length) / ranges.length) * 100);

      try {
        const batchLogs = await Promise.all(
          batch.map((r) =>
            publicClient.getLogs({
              address: this.contractAddress,
              fromBlock: r.from,
              toBlock: r.to,
            })
          )
        );

        // Flatten and sort chronologically by block number and log index
        const allLogs = batchLogs.flat().sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) {
            return Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n));
          }
          return Number((a.logIndex ?? 0) - (b.logIndex ?? 0));
        });

        for (const log of allLogs) {
          const processed = await this.processLog(log, isBackfill);
          if (processed) totalLogsProcessed++;
        }

        // Commit progress at each batch boundary
        const lastBatchBlock = batch[batch.length - 1].to;
        indexerRepo.setLastBlock(lastBatchBlock);

        if (isBackfill && (i % 20 === 0 || i + BATCH_SIZE >= ranges.length)) {
          console.log(`⏳ [BACKFILL PROGRESS] ${progressPercent}% synced (Block ${lastBatchBlock} / ${toBlock})`);
        }
      } catch (err: any) {
        console.error(`❌ Error fetching logs for batch starting at block ${batch[0].from}:`, err?.message || err);
        throw err;
      }
    }

    return totalLogsProcessed;
  }


  /**
   * Processes a single log with strict idempotency (txHash + logIndex).
   */
  public async processLog(log: Log, isBackfill: boolean): Promise<boolean> {
    const txHash = log.transactionHash as string;
    const logIndex = Number(log.logIndex ?? 0);
    const blockNumber = log.blockNumber ? BigInt(log.blockNumber) : 0n;

    if (!txHash) return false;

    // Idempotency check: Skip if already processed
    if (indexerRepo.isEventProcessed(txHash, logIndex)) {
      return false;
    }

    let decoded: any;
    try {
      decoded = decodeEventLog({
        abi: AJO_CLUB_EVENTS_ABI,
        data: log.data,
        topics: log.topics,
      });
    } catch {
      // Event not in our ABI (e.g. standard OpenZeppelin ownership events)
      return false;
    }

    const { eventName, args } = decoded;

    // Execute state update atomically in SQLite transaction
    await db.transaction(async () => {
      switch (eventName) {
        case "ClubCreated":
          await this.handleClubCreated(args, log, isBackfill);
          break;
        case "MemberJoined":
          await this.handleMemberJoined(args, log, isBackfill);
          break;
        case "ContributionMade":
          await this.handleContributionMade(args, log, isBackfill);
          break;
        case "PayoutSent":
          await this.handlePayoutSent(args, log, isBackfill);
          break;
        case "ClubComplete":
          await this.handleClubComplete(args, log, isBackfill);
          break;
        case "MemberDefaulted":
          await this.handleMemberDefaulted(args, log, isBackfill);
          break;
        case "ClubCancelled":
          await this.handleClubCancelled(args, log, isBackfill);
          break;
        case "MemberLeft":
          await this.handleMemberLeft(args, log, isBackfill);
          break;
      }

      // Record dedup key
      indexerRepo.recordEvent(txHash, logIndex, eventName, blockNumber);
    });

    return true;
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  private async handleClubCreated(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    const creator = (args.creator as string).toLowerCase();
    const name = args.name as string;
    const token = (args.token as string).toLowerCase();
    const contribution = args.contribution as bigint;

    console.log(`[INDEXER] 🫙 Detected ClubCreated: #${clubId} "${name}" (creator: ${creator.slice(0, 6)}…${creator.slice(-4)})`);

    // Fetch full on-chain club parameters
    let onchainClub: any = null;
    try {
      onchainClub = await publicClient.readContract({
        address: this.contractAddress,
        abi: AJO_CLUB_ABI,
        functionName: "getClub",
        args: [BigInt(clubId)],
      });
    } catch (err: any) {
      console.warn(`[INDEXER] Could not fetch on-chain getClub(${clubId}): ${err.message}`);
    }

    const cycleDuration = onchainClub ? Number(onchainClub[3]) : 604800; // default 7 days
    const gracePeriod = onchainClub ? Number(onchainClub[4]) : 86400;     // default 24h
    const maxMembers = onchainClub ? Number(onchainClub[5]) : 3;
    const currentRound = onchainClub ? Number(onchainClub[6]) : 0;
    const cycleEnd = onchainClub ? Number(onchainClub[7]) : null;
    const statusIdx = onchainClub ? Number(onchainClub[8]) : 0;
    const statuses: CircleStatus[] = ["OPEN", "ACTIVE", "COMPLETE", "CANCELLED"];
    const status: CircleStatus = statuses[statusIdx] || "OPEN";

    const circle = circlesRepo.upsertFromContract({
      contract_circle_id: clubId,
      contract_address: this.contractAddress,
      name,
      token_address: token,
      token_symbol: "USDC",
      token_decimals: 6,
      contribution_amount: contribution.toString(),
      cycle_duration_seconds: cycleDuration,
      grace_period_seconds: gracePeriod,
      max_members: maxMembers,
      current_round: currentRound,
      cycle_end_timestamp: cycleEnd,
      status,
      creator_address: creator,
    });

    if (!isBackfill) {
      const unitUsdc = formatUnits(contribution, 6);
      const text = [
        `🫙 *New Ajo Circle Created on Base!*`,
        ``,
        `• *Circle:* ${name}`,
        `• *Club ID:* \`${clubId}\``,
        `• *Contribution:* *${unitUsdc} USDC* per round`,
        `• *Max Members:* ${maxMembers}`,
        `• *Cycle Duration:* ${Math.round(cycleDuration / 3600)}h`,
        ``,
        `👉 Use \`/status ${circle.id}\` to view circle progress.`,
      ].join("\n");

      // Broadcast if creator has a known telegram chat
      if (circle.telegram_chat_id) {
        await sendTelegramNotification(circle.telegram_chat_id, text);
      }
    }
  }

  private async handleMemberJoined(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    const memberAddress = (args.member as string).toLowerCase();

    console.log(`[INDEXER] 👤 Detected MemberJoined: Club #${clubId} member: ${memberAddress.slice(0, 6)}…${memberAddress.slice(-4)}`);

    let circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    if (!circle) {
      // Sync club if missing
      await this.handleClubCreated(
        { clubId, creator: memberAddress, name: `Club #${clubId}`, token: "0x0", contribution: 0n },
        log,
        true
      );
      circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    }
    if (!circle) return;

    // Check if member already in DB
    const existing = membersRepo.getByWallet(circle.id, memberAddress);
    if (existing) return;

    // Query on-chain members array to determine payout_order
    let payoutOrder = 0;
    try {
      const onchainClub = await publicClient.readContract({
        address: this.contractAddress,
        abi: AJO_CLUB_ABI,
        functionName: "getClub",
        args: [BigInt(clubId)],
      });
      const membersArr = (onchainClub[9] as string[]).map((m) => m.toLowerCase());
      const idx = membersArr.indexOf(memberAddress);
      payoutOrder = idx >= 0 ? idx : membersArr.length - 1;

      // Also check if club transitioned to ACTIVE
      const onchainStatus = Number(onchainClub[8]);
      if (onchainStatus === 1 && circle.status === "OPEN") {
        circlesRepo.updateStatus(circle.id, "ACTIVE");
        if (onchainClub[7]) {
          circlesRepo.updateCycle(circle.id, Number(onchainClub[6]), Number(onchainClub[7]));
        }
      }
    } catch {
      const currentMembers = membersRepo.getByCircle(circle.id);
      payoutOrder = currentMembers.length;
    }

    membersRepo.add({
      circle_id: circle.id,
      wallet_address: memberAddress,
      basename: null,
      telegram_user_id: null,
      telegram_username: null,
      payout_order: payoutOrder,
      has_paid_current_round: 0,
      total_contributed: "0",
      total_received: "0",
      status: "ACTIVE",
    });

    if (!isBackfill && circle.telegram_chat_id) {
      const shortAddr = `${memberAddress.slice(0, 6)}…${memberAddress.slice(-4)}`;
      const text = [
        `👤 *New Member Joined Circle!*`,
        ``,
        `• *Circle:* ${circle.name}`,
        `• *Member:* \`${shortAddr}\` (Payout Order #${payoutOrder + 1})`,
      ].join("\n");
      await sendTelegramNotification(circle.telegram_chat_id, text);
    }
  }

  private async handleContributionMade(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    const memberAddress = (args.member as string).toLowerCase();
    const round = Number(args.round);
    const txHash = log.transactionHash as string;
    const blockNumber = Number(log.blockNumber ?? 0);
    const now = Math.floor(Date.now() / 1000);

    console.log(`[INDEXER] 💰 Detected ContributionMade: Club #${clubId} (Round #${round + 1}) from ${memberAddress.slice(0, 6)}…${memberAddress.slice(-4)}`);

    let circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    if (!circle) return;

    // Record contribution event
    contributionsRepo.record({
      circle_id: circle.id,
      round,
      member_address: memberAddress,
      amount: circle.contribution_amount,
      tx_hash: txHash,
      block_number: blockNumber,
      timestamp: now,
    });

    // Update member's status and total_contributed
    membersRepo.recordContribution(circle.id, memberAddress, circle.contribution_amount);

    // Check if pot is now 100% funded
    const allMembers = membersRepo.getByCircle(circle.id);
    const paidCount = allMembers.filter((m) => m.has_paid_current_round === 1).length;
    const isPotFull = paidCount >= allMembers.length && allMembers.length > 0;

    if (!isBackfill) {
      const member = membersRepo.getByWallet(circle.id, memberAddress);
      const displayName = member?.basename || `${memberAddress.slice(0, 6)}…${memberAddress.slice(-4)}`;
      const unitAmount = formatUnits(BigInt(circle.contribution_amount), circle.token_decimals);

      const targetRecipient = circle.telegram_chat_id || member?.telegram_user_id;
      if (targetRecipient) {
        const text = [
          `💰 *Contribution Confirmed on Base!*`,
          ``,
          `• *Circle:* ${circle.name}`,
          `• *Member:* ${displayName}`,
          `• *Round:* #${round + 1}`,
          `• *Amount:* *${unitAmount} ${circle.token_symbol}*`,
          `• *Progress:* *${paidCount}/${allMembers.length} members contributed*`,
          `• *Explorer:* [View on Basescan](https://sepolia.basescan.org/tx/${txHash})`,
        ].join("\n");
        await sendTelegramNotification(targetRecipient, text);

        if (isPotFull) {
          const potTotal = (Number(unitAmount) * allMembers.length).toFixed(2);
          const fullText = [
            `🎉 *Round #${round + 1} Pot 100% Collected!*`,
            ``,
            `All ${allMembers.length} members have contributed!`,
            `Total Pot: *${potTotal} ${circle.token_symbol}* is safely locked in the smart contract.`,
            `Payout will be ready for approval once the round countdown elapses.`,
          ].join("\n");
          await sendTelegramNotification(targetRecipient, fullText);
        }
      }
    }
  }

  private async handlePayoutSent(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    const recipient = (args.recipient as string).toLowerCase();
    const amount = args.amount as bigint;
    const round = Number(args.round);
    const txHash = log.transactionHash as string;

    console.log(`[INDEXER] 🎁 Detected PayoutSent: Club #${clubId} (Round #${round + 1}) to ${recipient.slice(0, 6)}…${recipient.slice(-4)} (${formatUnits(amount, 6)} USDC)`);

    const circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    if (!circle) return;

    // Update recipient total_received in SQLite
    membersRepo.recordPayout(circle.id, recipient, amount.toString());

    // Query on-chain getClub to get accurate new round, cycleEnd, status
    let nextRound = round + 1;
    let nextCycleEnd: number | null = null;
    let isComplete = false;

    try {
      const onchainClub = await publicClient.readContract({
        address: this.contractAddress,
        abi: AJO_CLUB_ABI,
        functionName: "getClub",
        args: [BigInt(clubId)],
      });
      nextRound = Number(onchainClub[6]);
      nextCycleEnd = Number(onchainClub[7]);
      isComplete = Number(onchainClub[8]) === 2; // ClubStatus.COMPLETE
    } catch {
      // Fallback
    }

    if (isComplete) {
      circlesRepo.updateStatus(circle.id, "COMPLETE");
    } else {
      circlesRepo.updateCycle(circle.id, nextRound, nextCycleEnd ?? 0);
      membersRepo.resetRoundPaymentStatus(circle.id);
    }

    if (!isBackfill) {
      const member = membersRepo.getByWallet(circle.id, recipient);
      const recipientName = member?.basename || `${recipient.slice(0, 6)}…${recipient.slice(-4)}`;
      const unitAmount = formatUnits(amount, circle.token_decimals);
      const targetChat = circle.telegram_chat_id || member?.telegram_user_id;

      if (targetChat) {
        const text = [
          `🎁 *Round Payout Broadcasted on Base!*`,
          ``,
          `• *Circle:* ${circle.name}`,
          `• *Round:* #${round + 1}`,
          `• *Recipient:* ${recipientName}`,
          `• *Amount:* *${unitAmount} ${circle.token_symbol}*`,
          `• *Explorer:* [View on Basescan](https://sepolia.basescan.org/tx/${txHash})`,
          ``,
          isComplete
            ? `🎉 *Congratulations! Circle #${circle.id} has completed all rounds successfully!*`
            : `🔄 *Round #${nextRound + 1} has now begun!*`,
        ].join("\n");
        await sendTelegramNotification(targetChat, text);
      }
    }
  }

  private async handleClubComplete(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    console.log(`[INDEXER] 🏆 Detected ClubComplete: Club #${clubId}`);

    const circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    if (!circle) return;

    circlesRepo.updateStatus(circle.id, "COMPLETE");

    if (!isBackfill && circle.telegram_chat_id) {
      const text = `🏆 *Ajo Circle Complete!*\n\nAll rounds for *${circle.name}* have concluded and all members have received their pots!`;
      await sendTelegramNotification(circle.telegram_chat_id, text);
    }
  }

  private async handleMemberDefaulted(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    const memberAddress = (args.member as string).toLowerCase();
    const round = Number(args.round);

    console.log(`[INDEXER] ⚠️ Detected MemberDefaulted: Club #${clubId} member ${memberAddress} in round ${round}`);

    const circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    if (!circle) return;

    db.run(
      `UPDATE members SET status = 'DEFAULTED' WHERE circle_id = ? AND wallet_address = ?`,
      [circle.id, memberAddress]
    );

    if (!isBackfill && circle.telegram_chat_id) {
      const shortAddr = `${memberAddress.slice(0, 6)}…${memberAddress.slice(-4)}`;
      const text = `⚠️ *Member Default Flagged on Base*\n\nMember \`${shortAddr}\` defaulted on contribution for Round #${round + 1}.`;
      await sendTelegramNotification(circle.telegram_chat_id, text);
    }
  }

  private async handleClubCancelled(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    const circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    if (!circle) return;
    circlesRepo.updateStatus(circle.id, "CANCELLED");
  }

  private async handleMemberLeft(args: any, log: Log, isBackfill: boolean): Promise<void> {
    const clubId = Number(args.clubId);
    const memberAddress = (args.member as string).toLowerCase();
    const circle = circlesRepo.getByContractCircleIdAndAddress(clubId, this.contractAddress);
    if (!circle) return;
    db.run(
      `UPDATE members SET status = 'LEFT' WHERE circle_id = ? AND wallet_address = ?`,
      [circle.id, memberAddress]
    );
  }
}

/**
 * CLI Entrypoint when executed directly via npm run indexer
 */
export async function startIndexer(): Promise<AjoClubIndexer> {
  const indexer = new AjoClubIndexer();
  await indexer.init();
  indexer.start();

  process.on("SIGINT", () => {
    indexer.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    indexer.stop();
    process.exit(0);
  });

  return indexer;
}

const isMain =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("indexer/index.ts") ||
    process.argv[1].endsWith("indexer\\index.ts") ||
    process.argv[1].includes("indexer"));

if (isMain) {
  startIndexer().catch((err) => {
    console.error("❌ Fatal Indexer Crash:", err);
    process.exit(1);
  });
}

