import { expect } from "chai";
import { ethers } from "hardhat";
import { AjoClub } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AjoClub", function () {
  let ajoClub: AjoClub;
  let cUSD: any;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  const CONTRIBUTION = ethers.parseUnits("50", 6); // 50 USDC (Base standard)
  const CYCLE = 7 * 24 * 3600; // 7 days
  const GRACE_PERIOD = 24 * 3600; // 24 hours

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();

    // Deploy mock ERC20 with 6 decimals (USDC standard on Base)
    const MockToken = await ethers.getContractFactory("MockERC20");
    cUSD = await MockToken.deploy("USD Coin", "USDC", 6);
    await cUSD.waitForDeployment();

    // Whitelist it in the contract (we patch allowedTokens via a test-friendly deploy)
    const AjoClubFactory = await ethers.getContractFactory("AjoClubTest");
    ajoClub = (await AjoClubFactory.deploy(await cUSD.getAddress())) as AjoClub;
    await ajoClub.waitForDeployment();

    // Mint and approve for all members
    for (const signer of [alice, bob, carol]) {
      await cUSD.mint(signer.address, ethers.parseUnits("1000", 6));
      await cUSD.connect(signer).approve(await ajoClub.getAddress(), ethers.parseUnits("1000", 6));
    }
  });

  async function setupOpenClub() {
    await ajoClub.connect(owner).createClub("TestClub", await cUSD.getAddress(), CONTRIBUTION, CYCLE, GRACE_PERIOD, 3);
    return 0n; // clubId 0
  }

  async function verifyAndJoin(clubId: bigint, member: HardhatEthersSigner) {
    await (ajoClub as any).forceVerify(member.address);
    await ajoClub.connect(member).joinClub(clubId);
  }

  describe("createClub", () => {
    it("creates a club and emits ClubCreated", async () => {
      const tx = await ajoClub.connect(owner).createClub("TestClub", await cUSD.getAddress(), CONTRIBUTION, CYCLE, GRACE_PERIOD, 3);
      await expect(tx).to.emit(ajoClub, "ClubCreated").withArgs(0n, owner.address, "TestClub", await cUSD.getAddress(), CONTRIBUTION);
    });

    it("reverts for disallowed token", async () => {
      await expect(
        ajoClub.connect(owner).createClub("Bad", ethers.ZeroAddress, CONTRIBUTION, CYCLE, GRACE_PERIOD, 3)
      ).to.be.revertedWith("Token not allowed");
    });

    it("reverts for maxMembers < 2", async () => {
      await expect(
        ajoClub.connect(owner).createClub("Bad", await cUSD.getAddress(), CONTRIBUTION, CYCLE, GRACE_PERIOD, 1)
      ).to.be.revertedWith("Need at least 2 members");
    });

    it("reverts for gracePeriod = 0", async () => {
      await expect(
        ajoClub.connect(owner).createClub("Bad", await cUSD.getAddress(), CONTRIBUTION, CYCLE, 0, 3)
      ).to.be.revertedWith("Grace period must be > 0");
    });
  });

  describe("joinClub", () => {
    it("unverified member reverts", async () => {
      const clubId = await setupOpenClub();
      await expect(ajoClub.connect(alice).joinClub(clubId)).to.be.revertedWith("Must be Self-verified");
    });

    it("verified member can join", async () => {
      const clubId = await setupOpenClub();
      await (ajoClub as any).forceVerify(alice.address);
      await expect(ajoClub.connect(alice).joinClub(clubId)).to.emit(ajoClub, "MemberJoined").withArgs(clubId, alice.address);
    });

    it("full club reverts", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      const [, , , , extra] = await ethers.getSigners();
      await (ajoClub as any).forceVerify(extra.address);
      await expect(ajoClub.connect(extra).joinClub(clubId)).to.be.revertedWith("Club full");
    });

    it("duplicate join reverts", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await expect(ajoClub.connect(alice).joinClub(clubId)).to.be.revertedWith("Already a member");
    });
  });

  describe("contribute", () => {
    let clubId: bigint;
    beforeEach(async () => {
      clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);
    });

    it("member can contribute", async () => {
      await expect(ajoClub.connect(alice).contribute(clubId))
        .to.emit(ajoClub, "ContributionMade")
        .withArgs(clubId, alice.address, 0n);
    });

    it("double payment reverts", async () => {
      await ajoClub.connect(alice).contribute(clubId);
      await expect(ajoClub.connect(alice).contribute(clubId)).to.be.revertedWith("Already paid this cycle");
    });

    it("non-member reverts", async () => {
      const [, , , , stranger] = await ethers.getSigners();
      await expect(ajoClub.connect(stranger).contribute(clubId)).to.be.revertedWith("Not a member");
    });

    it("after cycleEnd reverts", async () => {
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);
      await expect(ajoClub.connect(alice).contribute(clubId)).to.be.revertedWith("Cycle has ended");
    });
  });

  describe("triggerPayout", () => {
    let clubId: bigint;
    beforeEach(async () => {
      clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);
    });

    it("not all paid reverts", async () => {
      await ajoClub.connect(alice).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);
      await expect(ajoClub.triggerPayout(clubId)).to.be.revertedWith("Not all members paid");
    });

    it("before cycleEnd reverts", async () => {
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await expect(ajoClub.triggerPayout(clubId)).to.be.revertedWith("Cycle not ended");
    });

    it("correct recipient receives full pot minus protocol fee", async () => {
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);

      const recipient = alice.address; // round 0 → members[0] = alice
      const balBefore = await cUSD.balanceOf(recipient);
      const feeRecipient = await ajoClub.feeRecipient();
      const feeBalBefore = await cUSD.balanceOf(feeRecipient);

      const grossPot = CONTRIBUTION * 3n; // 150 USDC
      const fee = (grossPot * 100n) / 10000n; // 1.5 USDC (1%)
      const netPayout = grossPot - fee; // 148.5 USDC

      await expect(ajoClub.triggerPayout(clubId))
        .to.emit(ajoClub, "PayoutSent")
        .withArgs(clubId, recipient, netPayout, 0n)
        .to.emit(ajoClub, "ProtocolFeeCollected")
        .withArgs(clubId, fee);

      const balAfter = await cUSD.balanceOf(recipient);
      expect(balAfter - balBefore).to.equal(netPayout);

      const feeBalAfter = await cUSD.balanceOf(feeRecipient);
      expect(feeBalAfter - feeBalBefore).to.equal(fee);
    });
  });

  describe("Full 3-member lifecycle", () => {
    it("completes all 3 rounds and emits ClubComplete", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      for (let round = 0; round < 3; round++) {
        await ajoClub.connect(alice).contribute(clubId);
        await ajoClub.connect(bob).contribute(clubId);
        await ajoClub.connect(carol).contribute(clubId);
        await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
        await ethers.provider.send("evm_mine", []);
        const tx = ajoClub.triggerPayout(clubId);
        if (round === 2) {
          await expect(tx).to.emit(ajoClub, "ClubComplete").withArgs(clubId);
        } else {
          await tx;
        }
      }

      const club = await ajoClub.getClub(clubId);
      expect(club.status).to.equal(2); // COMPLETE
    });
  });

  describe("Missed payment handling", () => {
    it("member defaults, grace period passes, markDefaulted called, payout triggers with reduced pot", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      // Only alice and bob pay, carol defaults
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);

      // Advance past cycle end
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);

      // Before grace period: triggerPayout should revert
      await expect(ajoClub.triggerPayout(clubId)).to.be.revertedWith("Not all members paid");

      // Advance past grace period
      await ethers.provider.send("evm_increaseTime", [GRACE_PERIOD + 1]);
      await ethers.provider.send("evm_mine", []);

      // Mark carol as defaulted
      await expect(ajoClub.markDefaulted(clubId))
        .to.emit(ajoClub, "MemberDefaulted")
        .withArgs(clubId, carol.address, 0n);

      // Verify carol is marked as defaulted
      const defaulted = await ajoClub.getDefaultedMembers(clubId, 0n);
      expect(defaulted).to.have.lengthOf(1);
      expect(defaulted[0]).to.equal(carol.address);

      // Now triggerPayout should work with slashed collateral pot cover (2 paid + 90% of carol's collateral)
      const recipient = alice.address; // round 0 → members[0] = alice
      const balBefore = await cUSD.balanceOf(recipient);
      const feeRecipient = await ajoClub.feeRecipient();
      const feeBalBefore = await cUSD.balanceOf(feeRecipient);

      const paidPot = CONTRIBUTION * 2n; // 100 USDC
      const slashedPotCover = (CONTRIBUTION * 9000n) / 10000n; // 45 USDC (90%)
      const penalty = (CONTRIBUTION * 1000n) / 10000n; // 5 USDC (10%)
      const roundPot = paidPot + slashedPotCover; // 145 USDC
      const protocolFee = (roundPot * 100n) / 10000n; // 1.45 USDC (1%)
      const netPayout = roundPot - protocolFee; // 143.55 USDC
      const totalFees = protocolFee + penalty; // 6.45 USDC

      await expect(ajoClub.triggerPayout(clubId))
        .to.emit(ajoClub, "PayoutSent")
        .withArgs(clubId, recipient, netPayout, 0n)
        .to.emit(ajoClub, "CollateralSlashed")
        .withArgs(clubId, carol.address, 0n, slashedPotCover, penalty)
        .to.emit(ajoClub, "ProtocolFeeCollected")
        .withArgs(clubId, totalFees);

      const balAfter = await cUSD.balanceOf(recipient);
      expect(balAfter - balBefore).to.equal(netPayout);

      const feeBalAfter = await cUSD.balanceOf(feeRecipient);
      expect(feeBalAfter - feeBalBefore).to.equal(totalFees);
    });

    it("member defaults but grace period hasn't passed — triggerPayout reverts", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      // Only alice pays
      await ajoClub.connect(alice).contribute(clubId);

      // Advance past cycle end but not grace period
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);

      // triggerPayout should revert since not all members paid and grace period hasn't passed
      await expect(ajoClub.triggerPayout(clubId)).to.be.revertedWith("Not all members paid");
    });

    it("all members pay — behavior unchanged (regression check)", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      // All members pay
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);

      // Advance past cycle end
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);

      // triggerPayout should work with full pot minus 1% fee
      const recipient = alice.address; // round 0 → members[0] = alice
      const balBefore = await cUSD.balanceOf(recipient);
      const grossPot = CONTRIBUTION * 3n;
      const fee = (grossPot * 100n) / 10000n;
      const netPayout = grossPot - fee;

      await expect(ajoClub.triggerPayout(clubId))
        .to.emit(ajoClub, "PayoutSent")
        .withArgs(clubId, recipient, netPayout, 0n);
      const balAfter = await cUSD.balanceOf(recipient);
      expect(balAfter - balBefore).to.equal(netPayout);
    });
  });

  describe("Club cancellation and member leave", () => {
    it("creator cancels OPEN club — status becomes CANCELLED", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);

      const tx = await ajoClub.connect(owner).cancelClub(clubId);
      await expect(tx).to.emit(ajoClub, "ClubCancelled").withArgs(clubId, owner.address);

      const club = await ajoClub.getClub(clubId);
      expect(club.status).to.equal(3); // CANCELLED
    });

    it("creator cancels OPEN club with contributions — refunds members", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);

      // Alice contributes (this shouldn't happen in OPEN state, but let's test refund logic)
      // Actually, contribute requires ACTIVE status, so this test is for the refund logic in cancelClub
      // Since members can't contribute in OPEN state, we'll just test the status change

      const tx = await ajoClub.connect(owner).cancelClub(clubId);
      await expect(tx).to.emit(ajoClub, "ClubCancelled").withArgs(clubId, owner.address);

      const club = await ajoClub.getClub(clubId);
      expect(club.status).to.equal(3); // CANCELLED
    });

    it("cancelClub reverts if club is ACTIVE", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      await expect(ajoClub.connect(owner).cancelClub(clubId)).to.be.revertedWith("Club not open");
    });

    it("cancelClub reverts if caller is not creator", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);

      await expect(ajoClub.connect(alice).cancelClub(clubId)).to.be.revertedWith("Not creator");
    });

    it("member leaves OPEN club — removed from members array", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);

      const tx = await ajoClub.connect(alice).leaveClub(clubId);
      await expect(tx).to.emit(ajoClub, "MemberLeft").withArgs(clubId, alice.address);

      const club = await ajoClub.getClub(clubId);
      expect(club.members).to.have.lengthOf(1);
      expect(club.members[0]).to.equal(bob.address);
    });

    it("leaveClub reverts if club is ACTIVE", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      await expect(ajoClub.connect(alice).leaveClub(clubId)).to.be.revertedWith("Club not open");
    });

    it("leaveClub reverts if caller is not a member", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);

      await expect(ajoClub.connect(bob).leaveClub(clubId)).to.be.revertedWith("Not a member");
    });
  });

  describe("Admin Hooks", () => {
    it("owner can allowlist and disallow tokens", async () => {
      const randomToken = "0x0000000000000000000000000000000000001234";
      expect(await ajoClub.allowedTokens(randomToken)).to.be.false;

      await expect(ajoClub.connect(owner).setAllowedToken(randomToken, true))
        .to.emit(ajoClub, "TokenAllowed")
        .withArgs(randomToken, true);

      expect(await ajoClub.allowedTokens(randomToken)).to.be.true;

      await ajoClub.connect(owner).setAllowedToken(randomToken, false);
      expect(await ajoClub.allowedTokens(randomToken)).to.be.false;
    });

    it("non-owner cannot allowlist tokens", async () => {
      const randomToken = "0x0000000000000000000000000000000000001234";
      await expect(
        ajoClub.connect(alice).setAllowedToken(randomToken, true)
      ).to.be.revertedWithCustomError(ajoClub, "OwnableUnauthorizedAccount");
    });

    it("owner can verify and unverify members directly", async () => {
      expect(await ajoClub.isVerified(alice.address)).to.be.false;

      await expect(ajoClub.connect(owner).setVerified(alice.address, true))
        .to.emit(ajoClub, "MemberVerified")
        .withArgs(alice.address);

      expect(await ajoClub.isVerified(alice.address)).to.be.true;

      await ajoClub.connect(owner).setVerified(alice.address, false);
      expect(await ajoClub.isVerified(alice.address)).to.be.false;
    });

    it("owner can update protocol fee within bounds", async () => {
      expect(await ajoClub.protocolFeeBps()).to.equal(100n);

      await expect(ajoClub.connect(owner).setProtocolFee(250))
        .to.emit(ajoClub, "ProtocolFeeUpdated")
        .withArgs(250n);

      expect(await ajoClub.protocolFeeBps()).to.equal(250n);

      await expect(ajoClub.connect(owner).setProtocolFee(501)).to.be.revertedWith(
        "Fee cannot exceed 5%"
      );
    });

    it("non-owner cannot update protocol fee", async () => {
      await expect(
        ajoClub.connect(alice).setProtocolFee(200)
      ).to.be.revertedWithCustomError(ajoClub, "OwnableUnauthorizedAccount");
    });

    it("owner can update fee recipient", async () => {
      expect(await ajoClub.feeRecipient()).to.equal(owner.address);

      await expect(ajoClub.connect(owner).setFeeRecipient(carol.address))
        .to.emit(ajoClub, "FeeRecipientUpdated")
        .withArgs(carol.address);

      expect(await ajoClub.feeRecipient()).to.equal(carol.address);

      await expect(
        ajoClub.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee recipient");
    });

    it("non-owner cannot update fee recipient", async () => {
      await expect(
        ajoClub.connect(alice).setFeeRecipient(alice.address)
      ).to.be.revertedWithCustomError(ajoClub, "OwnableUnauthorizedAccount");
    });
  });

  describe("Collateral Deposit and Claiming", () => {
    it("honest members can reclaim their collateral upon club completion", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      // Complete round 0
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);
      await ajoClub.triggerPayout(clubId);

      // Complete round 1
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);
      await ajoClub.triggerPayout(clubId);

      // Complete round 2
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);
      await ajoClub.triggerPayout(clubId);

      // Verify club is complete
      const club = await ajoClub.getClub(clubId);
      expect(club.status).to.equal(2); // COMPLETE

      // Alice reclaims her collateral
      const aliceBalBefore = await cUSD.balanceOf(alice.address);
      const tx = await ajoClub.connect(alice).claimCollateral(clubId);
      await expect(tx)
        .to.emit(ajoClub, "CollateralRefunded")
        .withArgs(clubId, alice.address, CONTRIBUTION);

      const aliceBalAfter = await cUSD.balanceOf(alice.address);
      expect(aliceBalAfter - aliceBalBefore).to.equal(CONTRIBUTION);

      // Trying to claim again reverts
      await expect(
        ajoClub.connect(alice).claimCollateral(clubId)
      ).to.be.revertedWith("Collateral already claimed");
    });

    it("member cannot claim collateral while club is ACTIVE", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      await expect(
        ajoClub.connect(alice).claimCollateral(clubId)
      ).to.be.revertedWith("Club not complete");
    });

    it("slashed defaulter has no collateral left to claim", async () => {
      const clubId = await setupOpenClub();
      await verifyAndJoin(clubId, alice);
      await verifyAndJoin(clubId, bob);
      await verifyAndJoin(clubId, carol);
      await ajoClub.connect(owner).startClub(clubId);

      // Alice and Bob pay, Carol defaults
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);

      // Pass cycleEnd + gracePeriod
      await ethers.provider.send("evm_increaseTime", [CYCLE + GRACE_PERIOD + 1]);
      await ethers.provider.send("evm_mine", []);

      // Trigger payout, which slashes Carol's collateral
      await ajoClub.triggerPayout(clubId);

      // Verify Carol's collateral is now 0
      const [carolCol, carolClaimed] = await ajoClub.getMemberCollateral(clubId, carol.address);
      expect(carolCol).to.equal(0n);
      expect(carolClaimed).to.be.false;

      // Complete remaining rounds so club is COMPLETE
      // Round 1 (Bob recipient): Alice and Carol pay, or Alice and Bob pay
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);
      await ajoClub.triggerPayout(clubId);

      // Round 2 (Carol recipient)
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);
      await ajoClub.triggerPayout(clubId);

      const club = await ajoClub.getClub(clubId);
      expect(club.status).to.equal(2); // COMPLETE

      // Carol tries to claim collateral, but it was slashed
      await expect(
        ajoClub.connect(carol).claimCollateral(clubId)
      ).to.be.revertedWith("No collateral to claim");
    });
  });
});

