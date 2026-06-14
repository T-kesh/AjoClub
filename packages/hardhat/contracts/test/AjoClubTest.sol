// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../AjoClub.sol";

/// @dev Test-only subclass. Passes address(0) hub (scope calc skipped on local chain)
///      and adds helpers to whitelist tokens and force-verify addresses.
contract AjoClubTest is AjoClub {
    constructor(address extraToken)
        AjoClub(address(0), "test-scope")
    {
        allowedTokens[extraToken] = true;
    }

    /// @dev Bypasses Self Protocol — marks address as verified directly.
    function forceVerify(address member) external {
        isVerified[member] = true;
    }
}
