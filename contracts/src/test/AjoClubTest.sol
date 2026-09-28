// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../AjoClub.sol";

/// @dev Test-only subclass. Passes address(0) hub (scope calc skipped on local chain)
contract AjoClubTest is AjoClub {
    constructor(address extraToken)
        AjoClub(address(0), "test-scope")
    {
        if (extraToken != address(0)) {
            allowedTokens[extraToken] = true;
        }
    }

    /// @dev Helper alias for test suite backwards-compatibility
    function forceVerify(address member) external {
        isVerified[member] = true;
        emit MemberVerified(member);
    }
}
