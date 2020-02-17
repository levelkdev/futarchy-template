pragma solidity 0.4.24;

// HACK to workaround truffle artifact loading on dependencies

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "@levelk/token-price-oracles/contracts/DataFeeds/TokenPriceDataFeed.sol";
import "@levelk/futarchy-app/contracts/DecisionMarkets/DecisionMarketsFactory.sol";
import "@levelk/futarchy-app/contracts/DecisionMarkets/SettableDecisionMarkets.sol";
import "@aragon/os/contracts/factory/ENSFactory.sol";
import "@aragon/os/contracts/factory/APMRegistryFactory.sol";
import "@aragon/os/contracts/factory/EVMScriptRegistryFactory.sol";
import "@aragon/id/contracts/FIFSResolvingRegistrar.sol";
import "@aragon/apps-shared-migrations/contracts/Migrations.sol";
import '@levelk/pm-contracts/contracts/MarketMakers/LMSRMarketMaker.sol';

contract Imports {}
