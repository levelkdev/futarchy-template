const fs = require('fs')
const { randomId } = require('dao-templates/shared/helpers/aragonId')
const { numberToBytes32, addressToBytes32 } = require('../src/utils')

const FutarchyTemplate = artifacts.require('FutarchyTemplate')

const HOLDERS = [
  '0x33329f5a360649eb1c473b998cf3b975feb109f6',
  '0x44360017c1460bc0149946b4fad97665c25586b0'
]
const STAKES = HOLDERS.map(() => 1e18)

const TOKEN_NAME = 'AragonFutarchySignalingMarketToken'
const TOKEN_SYMBOL = 'AFSMT'

const ONE_DAY = 60 * 60 * 24
const ONE_WEEK = ONE_DAY * 7

const VOTE_DURATION = ONE_WEEK
const SUPPORT_REQUIRED = 50e16
const MIN_ACCEPTANCE_QUORUM = 5e16
const VOTING_SETTINGS = [SUPPORT_REQUIRED, MIN_ACCEPTANCE_QUORUM, VOTE_DURATION]
const FUTARCHY_FEE = 2000
const FUTARCHY_TRADING_PERIOD = 60 * 60 * 24 * 7
const FUTARCHY_TIME_TO_PRICE_RESOLUTION = FUTARCHY_TRADING_PERIOD * 2
const FUTARCHY_MARKET_FUND_AMOUNT = 10 * 10 ** 18
const FUTARCHY_TOKEN = '0x4f2c50140e85a5fa7c86151487e6b41f63a706e5'
const FUTARCHY_ORACLE_FACTORY = '0xe53a21d1cb80c8112d12808bc37128bb5e32fcaf'
const PRICE_ORACLE_FACTORY = '0xf110f62e5165d71f4369e85d86587c28e55e7145'
const LMSR_MARKET_MAKER = '0xf930779b2f8efc687e690b2aef50e2ea326d4ada'

const ORACLE_MANAGER_DATA_FEED_SOURCES = [
  '0x4915c406f92cac8df60e22c3a5b1fd15b1cd6fb2',
  '0xdaec71c58228141a7b43f7c59f3dc3c0f1a64eb4'
]

const FUTARCHY_SETTINGS = [
  numberToBytes32(FUTARCHY_FEE),
  numberToBytes32(FUTARCHY_TRADING_PERIOD),
  numberToBytes32(FUTARCHY_TIME_TO_PRICE_RESOLUTION),
  numberToBytes32(FUTARCHY_MARKET_FUND_AMOUNT),
  addressToBytes32(FUTARCHY_TOKEN),
  addressToBytes32(FUTARCHY_ORACLE_FACTORY),
  addressToBytes32(PRICE_ORACLE_FACTORY),
  addressToBytes32(LMSR_MARKET_MAKER)
]

module.exports = async (callback) => {
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
    ORACLE_MANAGER_DATA_FEED_SOURCES
  )

  console.log('Deployed FutarchDAO:')
  console.log('  receipt.tx: ', receipt.tx)
  console.log('  receipt.logs: ', receipt.logs)
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
