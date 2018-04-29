pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/token/ERC827/ERC827Token.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract MainframeToken is ERC827Token, Pausable {
  string public constant name = "Mainframe Token";
  string public constant symbol = "MFT";
  uint8  public constant decimals = 18;
  address public distributor;

  modifier validDestination(address to) {
    require(to != address(0x0));
    require(to != address(this));
    _;
  }

  modifier isTradeable() {
    require(
      !paused ||
      msg.sender == owner ||
      msg.sender == distributor
    );
    _;
  }

  function MainframeToken() public {
    totalSupply_ = 10000000000 ether; // 10 billion, 18 decimals (ether = 10^18)
    balances[msg.sender] = totalSupply_;
    emit Transfer(address(0x0), msg.sender, totalSupply_);
  }

  // ERC20 Methods

  function transfer(address to, uint256 value) public validDestination(to) isTradeable returns (bool) {
    return super.transfer(to, value);
  }

  function transferFrom(address from, address to, uint256 value) public validDestination(to) isTradeable returns (bool) {
    return super.transferFrom(from, to, value);
  }

  function approve(address spender, uint256 value) public isTradeable returns (bool) {
    return super.approve(spender, value);
  }

  // ERC827 Methods

  function transfer(address to, uint256 value, bytes data) public validDestination(to) isTradeable returns (bool) {
    return super.transfer(to, value, data);
  }

  function transferFrom(address from, address to, uint256 value, bytes data) public validDestination(to) isTradeable returns (bool) {
    return super.transferFrom(from, to, value, data);
  }

  function approve(address spender, uint256 value, bytes data) public isTradeable returns (bool) {
    return super.approve(spender, value, data);
  }

  // Setters

  function setDistributor(address newDistributor) public onlyOwner {
    distributor = newDistributor;
  }

  // Token Drain

  function emergencyERC20Drain(ERC20 token, uint256 amount) public onlyOwner {
    // owner can drain tokens that are sent here by mistake
    token.transfer(owner, amount);
  }
}
