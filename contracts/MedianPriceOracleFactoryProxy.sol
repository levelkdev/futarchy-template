pragma solidity ^0.4.24;

import "@gnosis.pm/pm-contracts/contracts/GnosisUtilContracts/Proxy.sol";

/// @title Proxy contract for MedianPriceOracleFactory
contract MedianPriceOracleFactoryProxy is Proxy {
  address timeMedianDataFeed;
  uint medianTimeframe;

  constructor(
    address _timeMedianDataFeed,
    uint _medianTimeframe,
    address _masterCopy
  )
    Proxy(_masterCopy)
    public
  {
    timeMedianDataFeed = _timeMedianDataFeed;
    medianTimeframe = _medianTimeframe;
  }
}
