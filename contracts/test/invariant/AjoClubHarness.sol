// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Test harness for Foundry invariant / fuzz tests.
///      Identical to AjoClub.sol but Self Protocol verification replaced
///      by a simple forceVerify so no external hub is needed.
contract AjoClubHarness is Ownable, ReentrancyGuard {
    enum ClubStatus { OPEN, ACTIVE, COMPLETE, CANCELLED }

    struct Club {
        string     name;
        address    token;
        uint256    contribution;
        uint256    cycleDuration;
        uint256    gracePeriod;
        uint256    maxMembers;
        uint256    currentRound;
        uint256    cycleEnd;
        ClubStatus status;
        address    creator;
        address[]  members;
    }

    uint256 public clubCount;

    mapping(uint256 => Club) private clubs;
    mapping(uint256 => mapping(address => bool)) public hasPaid;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasDefaulted;
    mapping(address => bool) public isVerified;
    mapping(address => bool) public allowedTokens;

    event ClubCreated(uint256 indexed clubId, address indexed creator, string name, address token, uint256 contribution);
    event MemberJoined(uint256 indexed clubId, address indexed member);
    event ContributionMade(uint256 indexed clubId, address indexed member, uint256 round);
    event PayoutSent(uint256 indexed clubId, address indexed recipient, uint256 amount, uint256 round);
    event ClubComplete(uint256 indexed clubId);
    event MemberDefaulted(uint256 indexed clubId, address indexed member, uint256 round);
    event ClubCancelled(uint256 indexed clubId, address indexed cancelledBy);
    event MemberLeft(uint256 indexed clubId, address indexed member);

    constructor(address token) Ownable(msg.sender) {
        allowedTokens[token] = true;
    }

    function setVerified(address member, bool verified) external onlyOwner {
        isVerified[member] = verified;
    }

    function forceVerify(address member) external {
        isVerified[member] = true;
    }

    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
    }

    function createClub(
        string calldata name,
        address token,
        uint256 contribution,
        uint256 cycleDuration,
        uint256 gracePeriod,
        uint256 maxMembers
    ) external returns (uint256 clubId) {
        require(allowedTokens[token],   "Token not allowed");
        require(contribution > 0,       "Contribution must be > 0");
        require(cycleDuration > 0,      "Cycle duration must be > 0");
        require(gracePeriod > 0,        "Grace period must be > 0");
        require(maxMembers >= 2,        "Need at least 2 members");

        clubId = clubCount++;
        Club storage c = clubs[clubId];
        c.name          = name;
        c.token         = token;
        c.contribution  = contribution;
        c.cycleDuration = cycleDuration;
        c.gracePeriod   = gracePeriod;
        c.maxMembers    = maxMembers;
        c.status        = ClubStatus.OPEN;
        c.creator       = msg.sender;

        emit ClubCreated(clubId, msg.sender, name, token, contribution);
    }

    function joinClub(uint256 clubId) external {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.OPEN,       "Club not open");
        require(!isMember[clubId][msg.sender],     "Already a member");
        require(c.members.length < c.maxMembers,   "Club full");
        require(isVerified[msg.sender],            "Must be verified");

        isMember[clubId][msg.sender] = true;
        c.members.push(msg.sender);
        emit MemberJoined(clubId, msg.sender);
    }

    function startClub(uint256 clubId) external {
        Club storage c = clubs[clubId];
        require(msg.sender == c.creator,          "Not creator");
        require(c.status == ClubStatus.OPEN,      "Club not open");
        require(c.members.length == c.maxMembers, "Club not full");

        c.status   = ClubStatus.ACTIVE;
        c.cycleEnd = block.timestamp + c.cycleDuration;
        c.currentRound = 0;
    }

    function cancelClub(uint256 clubId) external nonReentrant {
        Club storage c = clubs[clubId];
        require(msg.sender == c.creator, "Not creator");
        require(c.status == ClubStatus.OPEN, "Club not open");

        c.status = ClubStatus.CANCELLED;
        emit ClubCancelled(clubId, msg.sender);

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
        require(c.status == ClubStatus.OPEN,     "Club not open");
        require(isMember[clubId][msg.sender],    "Not a member");

        uint256 refundAmount = 0;
        if (hasPaid[clubId][msg.sender]) {
            hasPaid[clubId][msg.sender] = false;
            refundAmount = c.contribution;
        }

        for (uint256 i = 0; i < c.members.length; i++) {
            if (c.members[i] == msg.sender) {
                c.members[i] = c.members[c.members.length - 1];
                c.members.pop();
                break;
            }
        }
        isMember[clubId][msg.sender] = false;
        emit MemberLeft(clubId, msg.sender);

        if (refundAmount > 0) {
            require(IERC20(c.token).transfer(msg.sender, refundAmount), "Refund failed");
        }
    }

    function contribute(uint256 clubId) external nonReentrant {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.ACTIVE,    "Club not active");
        require(isMember[clubId][msg.sender],     "Not a member");
        require(!hasPaid[clubId][msg.sender],     "Already paid this cycle");
        require(block.timestamp < c.cycleEnd,     "Cycle has ended");

        hasPaid[clubId][msg.sender] = true;
        emit ContributionMade(clubId, msg.sender, c.currentRound);

        require(
            IERC20(c.token).transferFrom(msg.sender, address(this), c.contribution),
            "Transfer failed"
        );
    }

    function triggerPayout(uint256 clubId) external nonReentrant {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.ACTIVE,     "Club not active");
        require(block.timestamp >= c.cycleEnd,     "Cycle not ended");

        if (block.timestamp < c.cycleEnd + c.gracePeriod) {
            for (uint256 i = 0; i < c.members.length; i++) {
                require(hasPaid[clubId][c.members[i]], "Not all members paid");
            }
        }

        uint256 payingMembers = 0;
        for (uint256 i = 0; i < c.members.length; i++) {
            if (hasPaid[clubId][c.members[i]]) payingMembers++;
        }
        require(payingMembers > 0, "No members paid");

        address recipient = c.members[c.currentRound];
        uint256 payout    = c.contribution * payingMembers;
        uint256 roundPaid = c.currentRound;

        _advanceCycle(clubId);
        emit PayoutSent(clubId, recipient, payout, roundPaid);

        require(IERC20(c.token).transfer(recipient, payout), "Payout failed");
    }

    function markDefaulted(uint256 clubId) external {
        Club storage c = clubs[clubId];
        require(c.status == ClubStatus.ACTIVE,                       "Club not active");
        require(block.timestamp >= c.cycleEnd + c.gracePeriod,      "Grace period not ended");

        for (uint256 i = 0; i < c.members.length; i++) {
            address member = c.members[i];
            if (!hasPaid[clubId][member] && !hasDefaulted[clubId][c.currentRound][member]) {
                hasDefaulted[clubId][c.currentRound][member] = true;
                emit MemberDefaulted(clubId, member, c.currentRound);
            }
        }
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

    function getClub(uint256 clubId) external view returns (
        string memory name, address token, uint256 contribution,
        uint256 cycleDuration, uint256 gracePeriod, uint256 maxMembers,
        uint256 currentRound, uint256 cycleEnd, ClubStatus status, address[] memory members
    ) {
        Club storage c = clubs[clubId];
        return (c.name, c.token, c.contribution, c.cycleDuration, c.gracePeriod,
                c.maxMembers, c.currentRound, c.cycleEnd, c.status, c.members);
    }

    function getMembers(uint256 clubId) external view returns (address[] memory) {
        return clubs[clubId].members;
    }

    function getStatus(uint256 clubId) external view returns (ClubStatus) {
        return clubs[clubId].status;
    }

    function getCurrentRound(uint256 clubId) external view returns (uint256) {
        return clubs[clubId].currentRound;
    }

    function getContribution(uint256 clubId) external view returns (uint256) {
        return clubs[clubId].contribution;
    }
}