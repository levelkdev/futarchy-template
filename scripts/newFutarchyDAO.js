const fs = require('fs')
const { randomId } = require('dao-templates/shared/helpers/aragonId')
const { numberToBytes32, addressToBytes32 } = require('../src/utils')

const FutarchyTemplate = artifacts.require('FutarchyTemplate')

const testAddr1 = '0x33329f5a360649eb1c473b998cf3b975feb109f6'
const testAddr2 = '0x44360017c1460bc0149946b4fad97665c25586b0'

const rinkebyDaiAddr = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'

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
const FUTARCHY_TOKEN = rinkebyDaiAddr
const FUTARCHY_ORACLE_FACTORY = '0x1fad5ae333ef73ea9810bf90846cadbaabb72a36'
const LMSR_MARKET_MAKER = '0x5995f896899256ac9496d17a03125b2ea3df34a4'

const ORACLE_MANAGER_DATA_FEED_SOURCES = [
  '0x93d8bd939cf2ffb69bd1b90fb79708c018643a9f' // MKR/DAI Uniswap data fed
]

const FUTARCHY_SETTINGS = [
  numberToBytes32(FUTARCHY_FEE),
  numberToBytes32(FUTARCHY_TRADING_PERIOD),
  numberToBytes32(FUTARCHY_TIME_TO_PRICE_RESOLUTION),
  numberToBytes32(FUTARCHY_MARKET_FUND_AMOUNT),
  addressToBytes32(FUTARCHY_TOKEN),
  addressToBytes32(FUTARCHY_ORACLE_FACTORY),
  addressToBytes32(LMSR_MARKET_MAKER)
]

const MEDIAN_PRICE_ORACLE_TIMEFRAME = 60 * 60 * 24

module.exports = async (callback) => {
  try {
    const network = process.argv[5]
    const { address: futarchyTemplateAddr } = getConfig(network)
    const futarchyTemplate = await FutarchyTemplate.at(futarchyTemplateAddr)

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
  } catch (err) {
    console.log('Error in scripts/newFutarchyDAO.js: ', err)
  }
  callback()
}

function getConfig(network) {
  const envMap = {
    'rinkeby': 'staging',
    'mainnet': 'production'
  }
  const environment = envMap[network]

  if (!environment) throw new Error(`No environment for network ${network}`)

  let arapp
  try {
    let contents = fs.readFileSync(`arapp.json`)
    arapp = JSON.parse(contents)
  } catch (err) {
    throw new Error('No existing arapp.json file found')
  }
  if (arapp.environments && arapp.environments[environment]) {
    return arapp.environments[environment]
  } else {
    throw new Error(`No environment ${environment} found in arapp.json`)
  }
}