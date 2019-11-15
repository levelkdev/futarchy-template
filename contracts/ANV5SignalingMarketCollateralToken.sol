pragma solidity 0.4.24;

import "@gnosis.pm/pm-contracts/contracts/Tokens/ERC20Gnosis.sol";

contract ANV5SignalingMarketCollateralToken is ERC20Gnosis {

  constructor (address[] accounts, uint256[] values) {
    require(accounts.length == values.length, 'ACCOUNT_VALUES_LENGTH_MISMATCH');
    for (uint8 i = 0; i < accounts.length; i++) {
      _mint(accounts[i], values[i]);
    }
  }

  function symbol() public view returns (string) {
    return "ANV5SMCT";
  }

}
