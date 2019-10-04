const { randomId } = require('dao-templates/shared/helpers/aragonId')
const { numberToBytes32, addressToBytes32 } = require('../src/utils')

const futarchyTemplateAddress = '0xfe18bcbedd6f46e0dfbb3aea02090f23ed1c4a28'

const testAddr1 = '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7'
const testAddr2 = '0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb'

const HOLDERS = [testAddr1, testAddr2]
const STAKES = HOLDERS.map(() => 1e18 * 100)

const TOKEN_NAME = 'AragonFutarchySignalingMarketToken'
const TOKEN_SYMBOL = 'AFSMT'

const ONE_DAY = 60 * 60 * 24
const ONE_WEEK = ONE_DAY * 7

const VOTE_DURATION = ONE_WEEK
const SUPPORT_REQUIRED = 1e16
const MIN_ACCEPTANCE_QUORUM = 1e16
const VOTING_SETTINGS = [SUPPORT_REQUIRED, MIN_ACCEPTANCE_QUORUM, VOTE_DURATION]
const FUTARCHY_FEE = 2000
const FUTARCHY_TRADING_PERIOD = 60 * 60 * 24 * 7
const FUTARCHY_TIME_TO_PRICE_RESOLUTION = FUTARCHY_TRADING_PERIOD * 2
const FUTARCHY_MARKET_FUND_AMOUNT = 1e18 / 10
const FUTARCHY_ORACLE_FACTORY = '0x1fad5ae333ef73ea9810bf90846cadbaabb72a36'
const LMSR_MARKET_MAKER = '0x5995f896899256ac9496d17a03125b2ea3df34a4'

const ORACLE_MANAGER_DATA_FEED_SOURCES = [
  '0x93d8bd939cf2ffb69bd1b90fb79708c018643a9f' // MKR/DAI Uniswap data fed
]

const MEDIAN_PRICE_ORACLE_TIMEFRAME = 60 * 60 * 24

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

    const futarchyTemplate = await FutarchyTemplate.at(futarchyTemplateAddress)

    const localToken = await LocalToken.new()
    console.log('Deployed LocalToken: ', localToken.address)
    await localToken.mint(testAddr1, 10000 * 10**18)
    console.log(`Minted ${10000 * 10**18} LocalToken to ${testAddr1}`)
    await localToken.mint(testAddr2, 10000 * 10**18)
    console.log(`Minted ${10000 * 10**18} LocalToken to ${testAddr2}`)

    const FUTARCHY_SETTINGS = [
      numberToBytes32(FUTARCHY_FEE),
      numberToBytes32(FUTARCHY_TRADING_PERIOD),
      numberToBytes32(FUTARCHY_TIME_TO_PRICE_RESOLUTION),
      numberToBytes32(FUTARCHY_MARKET_FUND_AMOUNT),
      addressToBytes32(localToken.address),
      addressToBytes32(FUTARCHY_ORACLE_FACTORY),
      addressToBytes32(LMSR_MARKET_MAKER)
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
