// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "./AjoClubHarness.sol";
import "./MockERC20.sol";

// =============================================================================
// Handler - mediates all fuzzer calls with ghost variable tracking
// =============================================================================
contract AjoClubHandler is Test {
    AjoClubHarness public ajo;
    MockERC20      public token;

    address[] public actors;
    uint256   public constant NUM_ACTORS = 5;

    uint256 public ghost_totalDeposited;
    uint256 public ghost_totalPaidOut;

    uint256[] private _clubIds;

    mapping(address => mapping(uint256 => uint256)) private _payoutCount;
    mapping(uint256 => uint256) private _roundsCompleted;

    constructor(AjoClubHarness _ajo, MockERC20 _token) {
        ajo   = _ajo;
        token = _token;

        for (uint256 i = 0; i < NUM_ACTORS; i++) {
            address actor = address(uint160(0xBEEF0000 + i));
            actors.push(actor);
            token.mint(actor, 1_000_000 * 1e6);
            vm.prank(actor);
            token.approve(address(ajo), type(uint256).max);
            ajo.forceVerify(actor);
        }
    }

    function getClubIds() external view returns (uint256[] memory) {
        return _clubIds;
    }

    function ghost_payoutCount(address actor, uint256 clubId) external view returns (uint256) {
        return _payoutCount[actor][clubId];
    }

    function ghost_roundsCompleted(uint256 clubId) external view returns (uint256) {
        return _roundsCompleted[clubId];
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function _clubId(uint256 seed) internal view returns (uint256) {
        if (_clubIds.length == 0) return 0;
        return _clubIds[seed % _clubIds.length];
    }

    function createClub(
        uint256 actorSeed,
        uint256 contribution,
        uint256 cycleDuration,
        uint256 gracePeriod,
        uint256 maxMembers
    ) external {
        address actor = _actor(actorSeed);
        contribution  = bound(contribution,  1e6,   1_000 * 1e6);
        cycleDuration = bound(cycleDuration, 3600,  30 days);
        gracePeriod   = bound(gracePeriod,   3600,  14 days);
        maxMembers    = bound(maxMembers,    2,     NUM_ACTORS);

        vm.prank(actor);
        uint256 id = ajo.createClub(
            "FuzzClub", address(token), contribution, cycleDuration, gracePeriod, maxMembers
        );
        _clubIds.push(id);
    }

    function joinClub(uint256 actorSeed, uint256 clubSeed) external {
        if (_clubIds.length == 0) return;
        address actor  = _actor(actorSeed);
        uint256 clubId = _clubId(clubSeed);
        vm.prank(actor);
        try ajo.joinClub(clubId) {} catch {}
    }

    function startClub(uint256 actorSeed, uint256 clubSeed) external {
        if (_clubIds.length == 0) return;
        uint256 clubId = _clubId(clubSeed);
        address actor  = _actor(actorSeed);
        vm.prank(actor);
        try ajo.startClub(clubId) {} catch {}
    }

    function contribute(uint256 actorSeed, uint256 clubSeed) external {
        if (_clubIds.length == 0) return;
        address actor  = _actor(actorSeed);
        uint256 clubId = _clubId(clubSeed);
        uint256 balBefore = token.balanceOf(address(ajo));

        vm.prank(actor);
        try ajo.contribute(clubId) {
            uint256 c = ajo.getContribution(clubId);
            ghost_totalDeposited += c;
            assert(token.balanceOf(address(ajo)) == balBefore + c);
        } catch {}
    }

    function triggerPayout(uint256 clubSeed, uint256 timeWarp) external {
        if (_clubIds.length == 0) return;
        uint256 clubId = _clubId(clubSeed);
        timeWarp = bound(timeWarp, 0, 60 days);
        vm.warp(block.timestamp + timeWarp);

        uint256 balBefore    = token.balanceOf(address(ajo));
        uint256 roundBefore  = ajo.getCurrentRound(clubId);
        address[] memory members = ajo.getMembers(clubId);
        address expectedRecipient = members.length > 0 ? members[roundBefore] : address(0);
        uint256 recipientBalBefore = expectedRecipient != address(0) ? token.balanceOf(expectedRecipient) : 0;

        try ajo.triggerPayout(clubId) {
            uint256 paid = balBefore - token.balanceOf(address(ajo));
            ghost_totalPaidOut += paid;
            if (expectedRecipient != address(0)) {
                uint256 gain = token.balanceOf(expectedRecipient) - recipientBalBefore;
                assert(gain == paid);
                _payoutCount[expectedRecipient][clubId]++;
            }
            _roundsCompleted[clubId]++;
        } catch {}
    }

    function markDefaulted(uint256 clubSeed, uint256 timeWarp) external {
        if (_clubIds.length == 0) return;
        uint256 clubId = _clubId(clubSeed);
        timeWarp = bound(timeWarp, 0, 60 days);
        vm.warp(block.timestamp + timeWarp);
        try ajo.markDefaulted(clubId) {} catch {}
    }

    function cancelClub(uint256 actorSeed, uint256 clubSeed) external {
        if (_clubIds.length == 0) return;
        uint256 clubId = _clubId(clubSeed);
        address actor  = _actor(actorSeed);
        vm.prank(actor);
        try ajo.cancelClub(clubId) {} catch {}
    }

    function leaveClub(uint256 actorSeed, uint256 clubSeed) external {
        if (_clubIds.length == 0) return;
        uint256 clubId = _clubId(clubSeed);
        address actor  = _actor(actorSeed);
        vm.prank(actor);
        try ajo.leaveClub(clubId) {} catch {}
    }
}

// =============================================================================
// Invariant Test Contract
// =============================================================================
contract AjoClubInvariantTest is Test {
    AjoClubHarness public ajo;
    MockERC20      public token;
    AjoClubHandler public handler;

    function setUp() public {
        token   = new MockERC20("USD Coin", "USDC", 6);
        ajo     = new AjoClubHarness(address(token));
        handler = new AjoClubHandler(ajo, token);
        targetContract(address(handler));
    }

    // -------------------------------------------------------------------------
    // INVARIANT 1: SOLVENCY
    // Contract balance >= totalDeposited - totalPaidOut at all times.
    // -------------------------------------------------------------------------
    function invariant_solvency() public view {
        uint256 bal      = token.balanceOf(address(ajo));
        uint256 deposited = handler.ghost_totalDeposited();
        uint256 paidOut   = handler.ghost_totalPaidOut();
        uint256 minBal    = deposited > paidOut ? deposited - paidOut : 0;

        assertGe(
            bal, minBal,
            "SOLVENCY INVARIANT BROKEN: balance < deposited - paid_out"
        );
    }

    // -------------------------------------------------------------------------
    // INVARIANT 2: TURN ORDER
    // No member can receive the payout more times than their fair round share.
    // -------------------------------------------------------------------------
    function invariant_turnOrder() public view {
        uint256[] memory ids = handler.getClubIds();
        for (uint256 c = 0; c < ids.length; c++) {
            uint256 clubId = ids[c];
            address[] memory members = ajo.getMembers(clubId);
            if (members.length == 0) continue;

            uint256 completed  = handler.ghost_roundsCompleted(clubId);
            uint256 maxAllowed = completed / members.length + 1;

            for (uint256 m = 0; m < members.length; m++) {
                assertLe(
                    handler.ghost_payoutCount(members[m], clubId),
                    maxAllowed,
                    "TURN ORDER INVARIANT BROKEN: member received payout more than their fair share"
                );
            }
        }
    }

    // -------------------------------------------------------------------------
    // INVARIANT 3: STRICT ACCOUNTING (ZERO RESIDUAL ON COMPLETE)
    // A COMPLETE club must have no hasPaid=true flags — all funds disbursed.
    // -------------------------------------------------------------------------
    function invariant_strictAccounting() public view {
        uint256[] memory ids = handler.getClubIds();
        for (uint256 c = 0; c < ids.length; c++) {
            uint256 clubId = ids[c];
            if (ajo.getStatus(clubId) == AjoClubHarness.ClubStatus.COMPLETE) {
                address[] memory members = ajo.getMembers(clubId);
                for (uint256 m = 0; m < members.length; m++) {
                    assertFalse(
                        ajo.hasPaid(clubId, members[m]),
                        "ACCOUNTING INVARIANT BROKEN: completed club has hasPaid=true"
                    );
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // INVARIANT 4: REENTRANCY GUARD
    // Contract balance >= sum of all active hasPaid contributions.
    // A reentrancy exploit would cause this to fail.
    // -------------------------------------------------------------------------
    function invariant_reentrancyGuard() public view {
        uint256[] memory ids = handler.getClubIds();
        uint256 accounted = 0;

        for (uint256 c = 0; c < ids.length; c++) {
            uint256 clubId = ids[c];
            if (ajo.getStatus(clubId) == AjoClubHarness.ClubStatus.ACTIVE) {
                address[] memory members = ajo.getMembers(clubId);
                uint256 contrib          = ajo.getContribution(clubId);
                for (uint256 m = 0; m < members.length; m++) {
                    if (ajo.hasPaid(clubId, members[m])) {
                        accounted += contrib;
                    }
                }
            }
        }

        assertGe(
            token.balanceOf(address(ajo)),
            accounted,
            "REENTRANCY INVARIANT BROKEN: balance < active contributions"
        );
    }

    // -------------------------------------------------------------------------
    // FUZZ TEST: Full N-member lifecycle — zero residual on completion
    // -------------------------------------------------------------------------
    function testFuzz_fullLifecycle(
        uint8  memberCount,
        uint64 contribution,
        uint64 cycleDuration
    ) public {
        memberCount   = uint8(bound(memberCount,   2, 8));
        contribution  = uint64(bound(contribution, 1e6, 100 * 1e6));
        cycleDuration = uint64(bound(cycleDuration, 3600, 30 days));

        MockERC20      t = new MockERC20("USDC", "USDC", 6);
        AjoClubHarness a = new AjoClubHarness(address(t));

        address[] memory mbrs = new address[](memberCount);
        for (uint256 i = 0; i < memberCount; i++) {
            mbrs[i] = address(uint160(0xA000 + i));
            t.mint(mbrs[i], uint256(contribution) * memberCount * 10);
            vm.prank(mbrs[i]);
            t.approve(address(a), type(uint256).max);
            a.forceVerify(mbrs[i]);
        }

        vm.prank(mbrs[0]);
        uint256 clubId = a.createClub("FuzzFull", address(t), contribution, cycleDuration, 3600, memberCount);
        for (uint256 i = 0; i < memberCount; i++) { vm.prank(mbrs[i]); a.joinClub(clubId); }
        vm.prank(mbrs[0]);
        a.startClub(clubId);

        for (uint256 round = 0; round < memberCount; round++) {
            for (uint256 i = 0; i < memberCount; i++) { vm.prank(mbrs[i]); a.contribute(clubId); }
            uint256 recipBefore = t.balanceOf(mbrs[round]);
            vm.warp(block.timestamp + uint256(cycleDuration) + 1);
            a.triggerPayout(clubId);
            assertEq(
                t.balanceOf(mbrs[round]) - recipBefore,
                uint256(contribution) * memberCount,
                "Wrong payout amount"
            );
        }

        assertEq(uint256(a.getStatus(clubId)), uint256(AjoClubHarness.ClubStatus.COMPLETE), "Not COMPLETE");
        assertEq(t.balanceOf(address(a)), 0, "Residual funds in completed club");
    }

    // -------------------------------------------------------------------------
    // FUZZ TEST: Partial default — reduced pot, zero residual
    // -------------------------------------------------------------------------
    function testFuzz_partialDefault(
        uint8  memberCount,
        uint8  defaultCount,
        uint64 contribution
    ) public {
        memberCount  = uint8(bound(memberCount,  3, 8));
        defaultCount = uint8(bound(defaultCount, 1, memberCount - 1));
        contribution = uint64(bound(contribution, 1e6, 100 * 1e6));

        MockERC20      t = new MockERC20("USDC", "USDC", 6);
        AjoClubHarness a = new AjoClubHarness(address(t));

        address[] memory mbrs = new address[](memberCount);
        for (uint256 i = 0; i < memberCount; i++) {
            mbrs[i] = address(uint160(0xB000 + i));
            t.mint(mbrs[i], uint256(contribution) * memberCount * 10);
            vm.prank(mbrs[i]);
            t.approve(address(a), type(uint256).max);
            a.forceVerify(mbrs[i]);
        }

        vm.prank(mbrs[0]);
        uint256 clubId = a.createClub("DefaultFuzz", address(t), contribution, 7 days, 1 days, memberCount);
        for (uint256 i = 0; i < memberCount; i++) { vm.prank(mbrs[i]); a.joinClub(clubId); }
        vm.prank(mbrs[0]);
        a.startClub(clubId);

        uint256 payers = memberCount - defaultCount;
        for (uint256 i = 0; i < payers; i++) { vm.prank(mbrs[i]); a.contribute(clubId); }

        vm.warp(block.timestamp + 7 days + 1 days + 1);
        a.markDefaulted(clubId);

        uint256 recipBefore = t.balanceOf(mbrs[0]);
        a.triggerPayout(clubId);

        assertEq(t.balanceOf(mbrs[0]) - recipBefore, uint256(contribution) * payers, "Wrong partial payout");
        assertEq(t.balanceOf(address(a)), 0, "Residual after partial payout");
    }

    // -------------------------------------------------------------------------
    // FUZZ TEST: Reentrancy during payout — no double-withdrawal
    // -------------------------------------------------------------------------
    function testFuzz_reentrancyOnPayout(uint64 contribution) public {
        contribution = uint64(bound(contribution, 1e6, 100 * 1e6));

        MockERC20      t = new MockERC20("USDC", "USDC", 6);
        AjoClubHarness a = new AjoClubHarness(address(t));

        address alice = address(0xA11CE);
        address bob   = address(0xB0B);

        t.mint(alice, uint256(contribution) * 10);
        t.mint(bob,   uint256(contribution) * 10);
        vm.prank(alice); t.approve(address(a), type(uint256).max);
        vm.prank(bob);   t.approve(address(a), type(uint256).max);
        a.forceVerify(alice);
        a.forceVerify(bob);

        vm.prank(alice);
        uint256 clubId = a.createClub("Reentrant", address(t), contribution, 1 hours, 1 hours, 2);
        vm.prank(alice); a.joinClub(clubId);
        vm.prank(bob);   a.joinClub(clubId);
        vm.prank(alice); a.startClub(clubId);

        vm.prank(alice); a.contribute(clubId);
        vm.prank(bob);   a.contribute(clubId);

        bytes memory reentrantCall = abi.encodeWithSignature("triggerPayout(uint256)", clubId);
        t.armReentrancy(address(a), reentrantCall);

        vm.warp(block.timestamp + 1 hours + 1);
        uint256 balBefore = t.balanceOf(address(a));
        a.triggerPayout(clubId);
        uint256 withdrawn = balBefore - t.balanceOf(address(a));

        assertEq(withdrawn, uint256(contribution) * 2, "Reentrancy allowed double-withdrawal");
        assertEq(t.balanceOf(address(a)), 0, "Residual after reentrancy test");
    }
}