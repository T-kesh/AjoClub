// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract MockERC20 {
    string  public name;
    string  public symbol;
    uint8   public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public reentrantTarget;
    bytes   public reentrantCalldata;
    bool    private _inCallback;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name     = _name;
        symbol   = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply    += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]          += amount;
        _maybeReenter();
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;
        _maybeReenter();
        return true;
    }

    function armReentrancy(address target, bytes calldata data) external {
        reentrantTarget   = target;
        reentrantCalldata = data;
    }

    function _maybeReenter() internal {
        if (reentrantTarget != address(0) && !_inCallback) {
            _inCallback = true;
            (bool ok,) = reentrantTarget.call(reentrantCalldata);
            ok;
            _inCallback = false;
            reentrantTarget   = address(0);
            reentrantCalldata = "";
        }
    }
}