const { randomId } = require('dao-templates/shared/helpers/aragonId')
const { numberToBytes32, addressToBytes32 } = require('../src/utils')

const futarchyTemplateAddress = '0x2e25c8f88c5cccbc9400e5bc86cf9c58c7604327'

const testAddr1 = '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7'
const testAddr2 = '0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb'

const HOLDERS = [testAddr1, testAddr2]

// DAO native tokens (AFSMT):
const STAKES = HOLDERS.map(() => 1 * 1e18)

const TOKEN_NAME = 'AragonFutarchySignalingMarketToken'
const TOKEN_SYMBOL = 'AFSMT'

const ONE_DAY = 60 * 60 * 24
const ONE_WEEK = ONE_DAY * 7

const VOTE_DURATION = ONE_WEEK
const SUPPORT_REQUIRED = 1e16
const MIN_ACCEPTANCE_QUORUM = 1e16
const VOTING_SETTINGS = [SUPPORT_REQUIRED, MIN_ACCEPTANCE_QUORUM, VOTE_DURATION]
const FUTARCHY_FEE = 0

// setting to 1 so decisionResolutionDate is immediately passed,
// allowing us to set the decision at any time
const FUTARCHY_TRADING_PERIOD = 1

// setting to 30 days total market time
const FUTARCHY_TIME_TO_PRICE_RESOLUTION = 60 * 60 * 24 * 30 // 30 days

const FUTARCHY_MARKET_FUND_AMOUNT = 100 * 1e18

const ORACLE_MANAGER_DATA_FEED_SOURCES = [
   // Mock token price data feed
   // deployed in token-price-oracles with `npm run deploy:local`
  '0x3949c4d6212781f7cb55fb69c0ae9d07eae14098'
]

const MEDIAN_PRICE_ORACLE_TIMEFRAME = 60 * 60 * 24

const COLLATERAL_TOKEN_MINT_AMOUNT = 10000 * 1e18

module.exports = async (
  callback,
  {
    web3: _web3,
    artifacts: _artifacts
  } = {}
) => {
  try {
    if (!this.web3) web3 = _web3
    if (!this.artifacts) artifacts = _artifacts

    const FutarchyTemplate = artifacts.require('FutarchyTemplate')
    const LocalToken = artifacts.require('LocalToken')
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

    const fixed192x64Math = await Fixed192x64Math.new()
    await LMSRMarketMaker.link('Fixed192x64Math', fixed192x64Math.address)
    const lmsrMarketMaker = await LMSRMarketMaker.new()
    console.log(`Deployed LMSRMarketMaker: ${lmsrMarketMaker.address}`)

    const categoricalEvent = await CategoricalEvent.new()
    const scalarEvent = await ScalarEvent.new()
    const outcomeToken = await OutcomeToken.new()
    const eventFactory = await EventFactory.new(
      categoricalEvent.address,
      scalarEvent.address,
      outcomeToken.address
    )
    console.log(`Deployed EventFactory: ${eventFactory.address}`)

    const standardMarketWithPriceLogger = await StandardMarketWithPriceLogger.new()
    const standardMarketWithPriceLoggerFactory = await StandardMarketWithPriceLoggerFactory.new(
      standardMarketWithPriceLogger.address
    )
    console.log(`Deployed StandardMarketWithPriceLoggerFactory:  ${standardMarketWithPriceLoggerFactory.address}`)

    const settableDecisionMarkets = await SettableDecisionMarkets.new()
    const decisionMarketsFactory = await DecisionMarketsFactory.new(
      settableDecisionMarkets.address,
      eventFactory.address,
      standardMarketWithPriceLoggerFactory.address
    )
    console.log(`Deployed DecisionMarketsFactory ${decisionMarketsFactory.address}`)
    console.log('')

    const localToken = await LocalToken.new()
    console.log('Deployed LocalToken: ', localToken.address)
    await localToken.mint(testAddr1, COLLATERAL_TOKEN_MINT_AMOUNT)
    console.log(`Minted ${COLLATERAL_TOKEN_MINT_AMOUNT} LocalToken to ${testAddr1}`)
    await localToken.mint(testAddr2, COLLATERAL_TOKEN_MINT_AMOUNT)
    console.log(`Minted ${COLLATERAL_TOKEN_MINT_AMOUNT} LocalToken to ${testAddr2}`)
    console.log('')

    const FUTARCHY_SETTINGS = [
      numberToBytes32(FUTARCHY_FEE),
      numberToBytes32(FUTARCHY_TRADING_PERIOD),
      numberToBytes32(FUTARCHY_TIME_TO_PRICE_RESOLUTION),
      numberToBytes32(FUTARCHY_MARKET_FUND_AMOUNT),
      addressToBytes32(localToken.address),
      addressToBytes32(decisionMarketsFactory.address),
      addressToBytes32(lmsrMarketMaker.address)
    ]

    const daoID = randomId()

    const receipt = await futarchyTemplate.newTokenAndInstance(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      daoID,
      HOLDERS,
      STAKES,
      VOTING_SETTINGS,
      FUTARCHY_SETTINGS,
      ORACLE_MANAGER_DATA_FEED_SOURCES,
      MEDIAN_PRICE_ORACLE_TIMEFRAME
    )

    console.log('Deployed FutarchDAO:')
    console.log('  receipt.tx: ', receipt.tx)
    console.log('  receipt.logs: ', receipt.logs)

    if (callback) {
      callback()
      return
    } else {
      return receipt
    }
  } catch (err) {
    console.log('Error in scripts/newFutarchyDAO.js: ', err)
  }
}
