pragma solidity 0.4.24;

import "@levelk/pm-contracts/contracts/Tokens/ERC20Gnosis.sol";

contract LocalToken is ERC20Gnosis {

  function symbol() public view returns (string) {
    return "LOCL";
  }

  function mint(address account, uint256 value) public {
    _mint(account, value);
  }

}
