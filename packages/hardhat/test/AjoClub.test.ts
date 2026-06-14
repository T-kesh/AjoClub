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

  const CONTRIBUTION = ethers.parseUnits("5", 18);
  const CYCLE = 7 * 24 * 3600; // 7 days

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();

    // Deploy mock ERC20
    const MockToken = await ethers.getContractFactory("MockERC20");
    cUSD = await MockToken.deploy("cUSD", "cUSD");
    await cUSD.waitForDeployment();

    // Whitelist it in the contract (we patch allowedTokens via a test-friendly deploy)
    const AjoClubFactory = await ethers.getContractFactory("AjoClubTest");
    ajoClub = (await AjoClubFactory.deploy(await cUSD.getAddress())) as AjoClub;
    await ajoClub.waitForDeployment();

    // Mint and approve for all members
    for (const signer of [alice, bob, carol]) {
      await cUSD.mint(signer.address, ethers.parseUnits("100", 18));
      await cUSD.connect(signer).approve(await ajoClub.getAddress(), ethers.parseUnits("100", 18));
    }
  });

  async function setupOpenClub() {
    await ajoClub.connect(owner).createClub("TestClub", await cUSD.getAddress(), CONTRIBUTION, CYCLE, 3);
    return 0n; // clubId 0
  }

  async function verifyAndJoin(clubId: bigint, member: HardhatEthersSigner) {
    await (ajoClub as any).forceVerify(member.address);
    await ajoClub.connect(member).joinClub(clubId);
  }

  describe("createClub", () => {
    it("creates a club and emits ClubCreated", async () => {
      const tx = await ajoClub.connect(owner).createClub("TestClub", await cUSD.getAddress(), CONTRIBUTION, CYCLE, 3);
      await expect(tx).to.emit(ajoClub, "ClubCreated").withArgs(0n, owner.address, "TestClub", await cUSD.getAddress(), CONTRIBUTION);
    });

    it("reverts for disallowed token", async () => {
      await expect(
        ajoClub.connect(owner).createClub("Bad", ethers.ZeroAddress, CONTRIBUTION, CYCLE, 3)
      ).to.be.revertedWith("Token not allowed");
    });

    it("reverts for maxMembers < 2", async () => {
      await expect(
        ajoClub.connect(owner).createClub("Bad", await cUSD.getAddress(), CONTRIBUTION, CYCLE, 1)
      ).to.be.revertedWith("Need at least 2 members");
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

    it("correct recipient receives full pot", async () => {
      await ajoClub.connect(alice).contribute(clubId);
      await ajoClub.connect(bob).contribute(clubId);
      await ajoClub.connect(carol).contribute(clubId);
      await ethers.provider.send("evm_increaseTime", [CYCLE + 1]);
      await ethers.provider.send("evm_mine", []);

      const recipient = alice.address; // round 0 → members[0] = alice
      const balBefore = await cUSD.balanceOf(recipient);
      await expect(ajoClub.triggerPayout(clubId))
        .to.emit(ajoClub, "PayoutSent")
        .withArgs(clubId, recipient, CONTRIBUTION * 3n, 0n);
      const balAfter = await cUSD.balanceOf(recipient);
      expect(balAfter - balBefore).to.equal(CONTRIBUTION * 3n);
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
});
