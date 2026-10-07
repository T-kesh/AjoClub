// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";

contract AjoClub is SelfVerificationRoot, Ownable, ReentrancyGuard {
    enum ClubStatus { OPEN, ACTIVE, COMPLETE, CANCELLED }

    struct Club {
        string name;
        address token;
        uint256 contribution;
        uint256 cycleDuration;
        uint256 gracePeriod;
        uint256 maxMembers;
        uint256 currentRound;
        uint256 cycleEnd;
        ClubStatus status;
        address creator;
        address[] members;
    }

    uint256 public clubCount;

    mapping(uint256 => Club) private clubs;
    mapping(uint256 => mapping(address => bool)) public hasPaid;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasDefaulted;

    // Global Self Protocol verification (once per address, valid for all clubs)
    mapping(address => bool) public isVerified;
    // Prevents one passport from verifying multiple addresses
    mapping(uint256 => bool) public nullifierUsed;
    // Stored configId registered atomically in constructor via Hub
    bytes32 public verificationConfigId;

    event ClubCreated(uint256 indexed clubId, address indexed creator, string name, address token, uint256 contribution);
    event MemberJoined(uint256 indexed clubId, address indexed member);
    event ContributionMade(uint256 indexed clubId, address indexed member, uint256 round);
    event PayoutSent(uint256 indexed clubId, address indexed recipient, uint256 amount, uint256 round);
    event ClubComplete(uint256 indexed clubId);
    event MemberVerified(address indexed member);
    event MemberDefaulted(uint256 indexed clubId, address indexed member, uint256 round);
    event ClubCancelled(uint256 indexed clubId, address indexed cancelledBy);
    event MemberLeft(uint256 indexed clubId, address indexed member);
    event TokenAllowed(address indexed token, bool allowed);

    // Hub addresses
    address private constant HUB_BASE_MAINNET = 0x6758c0C2A297E6878Bb9294916Afd2d099232977;
    address private constant HUB_BASE_SEPOLIA = 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74;
    address private constant HUB_CELO_MAINNET = 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF;

    // Allowed stablecoins (public for UI and Agent validation)
    mapping(address => bool) public allowedTokens;

    constructor(address hub, string memory scopeSeed)
        SelfVerificationRoot(hub, scopeSeed)
        Ownable(msg.sender)
    {
        // Register verification config with the Hub atomically — no post-deploy call needed.
        // Minimal config: liveness/uniqueness only, no age/country/OFAC checks.
        if (hub != address(0)) {
            SelfStructs.VerificationConfigV2 memory config = SelfUtils.formatVerificationConfigV2(
                SelfUtils.UnformattedVerificationConfigV2({
                    olderThan: 0,
                    forbiddenCountries: new string[](0),
                    ofacEnabled: false
                })
            );
            verificationConfigId = IIdentityVerificationHubV2(hub).setVerificationConfigV2(config);
        }

        // Base Mainnet tokens
        allowedTokens[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913] = true; // Base native USDC (6 decimals)
        allowedTokens[0x60a3e35cc30dAA003233B8E5B12Ef902BB871a2a] = true; // Base native EURC (6 decimals)

        // Base Sepolia testnet tokens
        allowedTokens[0x036CbD53842c5426634e7929541eC2318f3dCF7e] = true; // Base Sepolia USDC (6 decimals)

        // Legacy Celo tokens
        allowedTokens[0x765DE816845861e75A25fCA122bb6898B8B1282a] = true; // cUSD
        allowedTokens[0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73] = true; // cEUR
        allowedTokens[0x456a3D042C0DbD3db53D5489e98dFb038553B0d0] = true; // cKES
    }

    /// @notice Allows the contract owner to allowlist or disallow specific tokens.
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        require(token != address(0), "Invalid token address");
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    /// @notice Allows the contract owner or agent relayer to verify a member directly (e.g. via Coinbase Verifications / Basename).
    function setVerified(address member, bool verified) external onlyOwner {
        require(member != address(0), "Invalid member address");
        isVerified[member] = verified;
        if (verified) {
            emit MemberVerified(member);
        }
    }

    // ── Self Protocol ──────────────────────────────────────────────────────────

    /// @inheritdoc SelfVerificationRoot
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /// @inheritdoc SelfVerificationRoot
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        require(!nullifierUsed[output.nullifier], "Passport already used");
        require(output.userIdentifier != 0, "Invalid user identifier");

        address member = address(uint160(output.userIdentifier));
        nullifierUsed[output.nullifier] = true;
        isVerified[member] = true;

        emit MemberVerified(member);
    }

    // ── Club lifecycle ─────────────────────────────────────────────────────────

    function createClub(
        string calldata name,
        address token,
        uint256 contribution,
        uint256 cycleDuration,
        uint256 gracePeriod,
        uint256 maxMembers
    ) external returns (uint256 clubId) {
        require(allowedTokens[token], "Token not allowed");
        require(contribution > 0, "Contribution must be > 0");
        require(cycleDuration > 0, "Cycle duration must be > 0");
        require(gracePeriod > 0, "Grace period must be > 0");
        require(maxMembers >= 2, "Need at least 2 members");

        clubId = clubCount++;

        Club storage c = clubs[clubId];
        c.name = name;
        c.token = token;
        c.contribution = contribution;
        c.cycleDuration = cycleDuration;
        c.gracePeriod = gracePeriod;
        c.maxMembers = maxMembers;
        c.status = ClubStatus.OPEN;
        c.creator = msg.sender;

        emit ClubCreated(clubId, msg.sender, name, token, contribution);
    }

    function joinClub(uint256 clubId) external {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.OPEN, "Club not open");
        require(!isMember[clubId][msg.sender], "Already a member");
        require(c.members.length < c.maxMembers, "Club full");
        require(isVerified[msg.sender], "Must be Self-verified");

        isMember[clubId][msg.sender] = true;
        c.members.push(msg.sender);

        emit MemberJoined(clubId, msg.sender);
    }

    function startClub(uint256 clubId) external {
        Club storage c = clubs[clubId];
        require(msg.sender == c.creator, "Not creator");
        require(c.status == ClubStatus.OPEN, "Club not open");
        require(c.members.length == c.maxMembers, "Club not full");

        c.status = ClubStatus.ACTIVE;
        c.cycleEnd = block.timestamp + c.cycleDuration;
        c.currentRound = 0;
    }

    function cancelClub(uint256 clubId) external nonReentrant {
        Club storage c = clubs[clubId];
        require(msg.sender == c.creator, "Not creator");
        require(c.status == ClubStatus.OPEN, "Club not open");

        c.status = ClubStatus.CANCELLED;
        emit ClubCancelled(clubId, msg.sender);

        // Refund any contributions made by members
        for (uint256 i = 0; i < c.members.length; i++) {
            address member = c.members[i];
            if (hasPaid[clubId][member]) {
                hasPaid[clubId][member] = false;
                require(IERC20(c.token).transfer(member, c.contribution), "Refund failed");
            }
        }
    }

    function leaveClub(uint256 clubId) external nonReentrant {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.OPEN, "Club not open");
        require(isMember[clubId][msg.sender], "Not a member");

        uint256 refundAmount = 0;
        if (hasPaid[clubId][msg.sender]) {
            hasPaid[clubId][msg.sender] = false;
            refundAmount = c.contribution;
        }

        // Remove from members array
        for (uint256 i = 0; i < c.members.length; i++) {
            if (c.members[i] == msg.sender) {
                c.members[i] = c.members[c.members.length - 1];
                c.members.pop();
                break;
            }
        }

        isMember[clubId][msg.sender] = false;
        emit MemberLeft(clubId, msg.sender);

        // Refund after state updates (CEI pattern)
        if (refundAmount > 0) {
            require(IERC20(c.token).transfer(msg.sender, refundAmount), "Refund failed");
        }
    }

    // ── Cycle mechanics ────────────────────────────────────────────────────────

    function contribute(uint256 clubId) external nonReentrant {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.ACTIVE, "Club not active");
        require(isMember[clubId][msg.sender], "Not a member");
        require(!hasPaid[clubId][msg.sender], "Already paid this cycle");
        require(block.timestamp < c.cycleEnd, "Cycle has ended");

        hasPaid[clubId][msg.sender] = true;
        emit ContributionMade(clubId, msg.sender, c.currentRound);

        require(
            IERC20(c.token).transferFrom(msg.sender, address(this), c.contribution),
            "Transfer failed"
        );
    }

    function triggerPayout(uint256 clubId) external nonReentrant {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.ACTIVE, "Club not active");
        require(block.timestamp >= c.cycleEnd, "Cycle not ended");

        // Before grace period: all members must have paid
        if (block.timestamp < c.cycleEnd + c.gracePeriod) {
            for (uint256 i = 0; i < c.members.length; i++) {
                require(hasPaid[clubId][c.members[i]], "Not all members paid");
            }
        }

        // Calculate payout based on members who actually paid
        uint256 payingMembers = 0;
        for (uint256 i = 0; i < c.members.length; i++) {
            if (hasPaid[clubId][c.members[i]]) {
                payingMembers++;
            }
        }
        require(payingMembers > 0, "No members paid");

        address recipient = c.members[c.currentRound];
        uint256 payout = c.contribution * payingMembers;
        uint256 roundPaid = c.currentRound;

        _advanceCycle(clubId);
        emit PayoutSent(clubId, recipient, payout, roundPaid);

        require(IERC20(c.token).transfer(recipient, payout), "Payout failed");
    }

    function _advanceCycle(uint256 clubId) internal {
        Club storage c = clubs[clubId];

        if (c.currentRound + 1 == c.members.length) {
            c.status = ClubStatus.COMPLETE;
            emit ClubComplete(clubId);
            return;
        }

        c.currentRound++;
        c.cycleEnd = block.timestamp + c.cycleDuration;

        for (uint256 i = 0; i < c.members.length; i++) {
            hasPaid[clubId][c.members[i]] = false;
        }
    }

    function markDefaulted(uint256 clubId) external {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.ACTIVE, "Club not active");
        require(block.timestamp >= c.cycleEnd + c.gracePeriod, "Grace period not ended");

        for (uint256 i = 0; i < c.members.length; i++) {
            address member = c.members[i];
            if (!hasPaid[clubId][member] && !hasDefaulted[clubId][c.currentRound][member]) {
                hasDefaulted[clubId][c.currentRound][member] = true;
                emit MemberDefaulted(clubId, member, c.currentRound);
            }
        }
    }

    // ── Views ──────────────────────────────────────────────────────────────────

    function getClub(uint256 clubId) external view returns (
        string memory name,
        address token,
        uint256 contribution,
        uint256 cycleDuration,
        uint256 gracePeriod,
        uint256 maxMembers,
        uint256 currentRound,
        uint256 cycleEnd,
        ClubStatus status,
        address[] memory members
    ) {
        Club storage c = clubs[clubId];
        return (c.name, c.token, c.contribution, c.cycleDuration, c.gracePeriod, c.maxMembers,
                c.currentRound, c.cycleEnd, c.status, c.members);
    }

    function getMemberPaymentStatus(uint256 clubId) external view returns (
        address[] memory members,
        bool[] memory paid
    ) {
        Club storage c = clubs[clubId];
        uint256 len = c.members.length;
        paid = new bool[](len);
        for (uint256 i = 0; i < len; i++) {
            paid[i] = hasPaid[clubId][c.members[i]];
        }
        return (c.members, paid);
    }

    function getDefaultedMembers(uint256 clubId, uint256 round) external view returns (
        address[] memory defaulted
    ) {
        Club storage c = clubs[clubId];
        uint256 count = 0;
        for (uint256 i = 0; i < c.members.length; i++) {
            if (hasDefaulted[clubId][round][c.members[i]]) {
                count++;
            }
        }
        defaulted = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < c.members.length; i++) {
            if (hasDefaulted[clubId][round][c.members[i]]) {
                defaulted[idx++] = c.members[i];
            }
        }
    }

    function getActiveClubs() external view returns (uint256[] memory clubIds) {
        uint256 count = 0;
        for (uint256 i = 0; i < clubCount; i++) {
            if (clubs[i].status == ClubStatus.ACTIVE) count++;
        }
        clubIds = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < clubCount; i++) {
            if (clubs[i].status == ClubStatus.ACTIVE) clubIds[idx++] = i;
        }
    }
}
