const tryDeployToNetwork = require('../src/tryDeployToNetwork')
const { randomId } = require('dao-templates/shared/helpers/aragonId')
const { numberToBytes32, addressToBytes32 } = require('../src/utils')

// via `npm run publish:staging` APM publish to `futarchy-template.open.aragonpm.eth`
// const futarchyTemplateAddress = '0xc6A943c51667c09BB9a5D0d058F1eF0eD153fB47'

// via `npm run deploy:staging`
const futarchyTemplateAddress = '0xb52b85b51dd2c50ceef135c03ac8a57e87cb999e'

const daoTokenHolder1 = '0x33329f5a360649eb1c473b998cf3b975feb109f6'
const daoTokenHolder2 = '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7'

const HOLDERS = [daoTokenHolder1, daoTokenHolder2]

const COLLATERAL_TOKEN_MINT_AMOUNT = 10000 * 1e18

// DAO native tokens (ANV5SMDT):
const STAKES = HOLDERS.map(() => 1 * 1e18)

// Collateral tokens (ANV5SMCT)
const AIRDROP_ADDRESSES = [
  '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
  '0x33329f5a360649eb1c473b998cf3b975feb109f6',
  '0x44360017c1460BC0149946b4fad97665c25586b0'
]

const AIRDROP_AMOUNTS = [
  COLLATERAL_TOKEN_MINT_AMOUNT,
  COLLATERAL_TOKEN_MINT_AMOUNT,
  COLLATERAL_TOKEN_MINT_AMOUNT
]

const TOKEN_NAME = 'ANV5SignalingMarketDAOToken'
const TOKEN_SYMBOL = 'ANV5SMDT'

const ONE_MINUTE = 60
const ONE_HOUR = ONE_MINUTE * 60
const ONE_DAY = ONE_HOUR * 24
const ONE_WEEK = ONE_DAY * 7

const VOTE_DURATION = ONE_WEEK
const SUPPORT_REQUIRED = 1e16
const MIN_ACCEPTANCE_QUORUM = 1e16
const VOTING_SETTINGS = [SUPPORT_REQUIRED, MIN_ACCEPTANCE_QUORUM, VOTE_DURATION]
const FUTARCHY_FEE = 0

// setting to 1 so decisionResolutionDate is immediately passed,
// allowing us to set the decision at any time
const FUTARCHY_TRADING_PERIOD = 1

// setting to 10 minutes total market time
const FUTARCHY_TIME_TO_PRICE_RESOLUTION = ONE_MINUTE * 10

const FUTARCHY_MARKET_FUND_AMOUNT = 100 * 1e18

const ORACLE_MANAGER_DATA_FEED_SOURCES = [
   // deployed with token-price-oracles: `npm run createPriceFeed:rinkeby MKR DAI`
  '0x00f1df0df72ec9220b921f907b3d5b631fff5785' // MKR/DAI Uniswap rinkeby price feed
]

const MEDIAN_PRICE_ORACLE_TIMEFRAME = ONE_MINUTE

module.exports = async (
  callback,
  {
    web3: _web3,
    artifacts: _artifacts
  } = {}
) => {
  const network = process.argv[5]

  try {
    if (!this.web3) web3 = _web3
    if (!this.artifacts) artifacts = _artifacts

    const FutarchyTemplate = artifacts.require('FutarchyTemplate')
    const ANV5SignalingMarketCollateralToken = artifacts.require('ANV5SignalingMarketCollateralToken')
    const Fixed192x64Math = artifacts.require('Fixed192x64Math')
    const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
    const CategoricalEvent = artifacts.require('CategoricalEvent')
    const ScalarEvent = artifacts.require('ScalarEvent')
    const OutcomeToken = artifacts.require('OutcomeToken')
    const SettableDecisionMarkets = artifacts.require('SettableDecisionMarkets')
    const StandardMarketWithPriceLogger = artifacts.require('StandardMarketWithPriceLogger')
    const EventFactory = artifacts.require('EventFactory')
    const StandardMarketWithPriceLoggerFactory = artifacts.require('StandardMarketWithPriceLoggerFactory')
    const DecisionMarketsFactory = artifacts.require('DecisionMarketsFactory')

    const futarchyTemplate = await FutarchyTemplate.at(futarchyTemplateAddress)

    const fixed192x64Math = await tryDeploy(Fixed192x64Math, 'Fixed192x64Math')

    await LMSRMarketMaker.link('Fixed192x64Math', fixed192x64Math.address)
    const lmsrMarketMaker = await tryDeploy(LMSRMarketMaker, 'LMSRMarketMaker')

    const categoricalEvent = await tryDeploy(CategoricalEvent, 'CategoricalEvent')
    const scalarEvent = await tryDeploy(ScalarEvent, 'ScalarEvent')
    const outcomeToken = await tryDeploy(OutcomeToken, 'OutcomeToken')
    const eventFactory = await tryDeploy(
      EventFactory,
      'EventFactory',
      [
        categoricalEvent.address,
        scalarEvent.address,
        outcomeToken.address
      ]
    )

    const standardMarketWithPriceLogger = await tryDeploy(
      StandardMarketWithPriceLogger,
      'StandardMarketWithPriceLogger'
    )

    const standardMarketWithPriceLoggerFactory = await tryDeploy(
      StandardMarketWithPriceLoggerFactory,
      'StandardMarketWithPriceLoggerFactory',
      [standardMarketWithPriceLogger.address]
    )

    const settableDecisionMarkets = await tryDeploy(
      SettableDecisionMarkets,
      'SettableDecisionMarkets'
    )
  
    const decisionMarketsFactory = await tryDeploy(
      DecisionMarketsFactory,
      'DecisionMarketsFactory',
      [
        settableDecisionMarkets.address,
        eventFactory.address,
        standardMarketWithPriceLoggerFactory.address
      ]
    )

    const anv5SignalingMarketCollateralToken = await tryDeploy(
      ANV5SignalingMarketCollateralToken,
      'ANV5SignalingMarketCollateralToken',
      [
        AIRDROP_ADDRESSES,
        AIRDROP_AMOUNTS
      ]
    )

    console.log()

    const FUTARCHY_SETTINGS = [
      numberToBytes32(FUTARCHY_FEE),
      numberToBytes32(FUTARCHY_TRADING_PERIOD),
      numberToBytes32(FUTARCHY_TIME_TO_PRICE_RESOLUTION),
      numberToBytes32(FUTARCHY_MARKET_FUND_AMOUNT),
      addressToBytes32(anv5SignalingMarketCollateralToken.address),
      addressToBytes32(decisionMarketsFactory.address),
      addressToBytes32(lmsrMarketMaker.address)
    ]

    const daoID = randomId()

    const newTokenTxReceipt = await futarchyTemplate.newToken(
      TOKEN_NAME,
      TOKEN_SYMBOL
    )

    console.log('Deployed FutarchyDAO token:')
    console.log('  newTokenTxReceipt.tx: ', newTokenTxReceipt.tx)
    console.log('  newTokenTxReceipt.logs: ', newTokenTxReceipt.logs)
    console.log()

    const newInstanceTxReceipt = await futarchyTemplate.newInstance(
      daoID,
      HOLDERS,
      STAKES,
      VOTING_SETTINGS,
      FUTARCHY_SETTINGS,
      ORACLE_MANAGER_DATA_FEED_SOURCES,
      MEDIAN_PRICE_ORACLE_TIMEFRAME
    )

    console.log('Deployed FutarchDAO instance:')
    console.log('  newInstanceTxReceipt.tx: ', newInstanceTxReceipt.tx)
    console.log('  newInstanceTxReceipt.logs: ', newInstanceTxReceipt.logs)

    if (callback) {
      callback()
      return
    } else {
      return receipt
    }
  } catch (err) {
    console.log('Error in scripts/newFutarchyDAOStaging.js: ', err)
  }

  async function tryDeploy (contractArtifact, contractName, params = []) {
    const resp = await tryDeployToNetwork(network, contractArtifact, contractName, params)
    return resp
  }
}
