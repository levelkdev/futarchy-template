const _ = require('lodash')
const readConfig = require('../src/readConfig')
const tryDeployToNetwork = require('../src/tryDeployToNetwork')
const { randomId } = require('dao-templates/shared/helpers/aragonId')
const { numberToBytes32, addressToBytes32 } = require('../src/utils')

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

    const config = readConfig(network)

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

    const futarchyTemplate = await FutarchyTemplate.at(config.futarchyTemplateAddress)

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

    const collateralTokenHolders = _.map(config.collateralTokenDistribution, 'holder')
    const collateralTokenAmounts = _.map(config.collateralTokenDistribution, (distData) => {
      return distData.amount * 1e18
    })

    console.log('Deploying collateral token and distributing: ', config.collateralTokenDistribution)
    console.log()

    const anv5SignalingMarketCollateralToken = await tryDeploy(
      ANV5SignalingMarketCollateralToken,
      'ANV5SignalingMarketCollateralToken',
      [
        collateralTokenHolders,
        collateralTokenAmounts
      ]
    )

    console.log()

    const votingSettings = [
      config.votingSettings.supportRequired * 1e18,
      config.votingSettings.minimumAcceptanceQuorum * 1e18,
      config.votingSettings.voteDuration
    ]

    const futarchySettings = [
      numberToBytes32(config.futarchySettings.fee * 1e18),
      numberToBytes32(config.futarchySettings.tradingPeriod),
      numberToBytes32(config.futarchySettings.timeToPriceResolution),
      numberToBytes32(config.futarchySettings.marketFundAmount * 1e18),
      addressToBytes32(anv5SignalingMarketCollateralToken.address),
      addressToBytes32(decisionMarketsFactory.address),
      addressToBytes32(lmsrMarketMaker.address)
    ]

    const daoID = randomId()

    const newTokenTxReceipt = await futarchyTemplate.newToken(
      config.daoTokenName,
      config.daoTokenSymbol
    )

    console.log('Deployed FutarchyDAO token:')
    console.log('  newTokenTxReceipt.tx: ', newTokenTxReceipt.tx)
    console.log('  newTokenTxReceipt.logs: ', newTokenTxReceipt.logs)
    console.log()

    const daoTokenHolders = _.map(config.daoTokenDistribution, 'holder')
    const daoTokenAmounts = _.map(config.daoTokenDistribution, (distData) => {
      return distData.amount * 1e18
    })

    console.log('Deploying DAO instance and distributing DAO token: ', config.daoTokenDistribution)
    console.log()

    const newInstanceTxReceipt = await futarchyTemplate.newInstance(
      daoID,
      daoTokenHolders,
      daoTokenAmounts,
      votingSettings,
      futarchySettings,
      config.oracleManagerSettings.dataFeedSources,
      config.medianPriceOracleTimeframe
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
    console.log('Error in scripts/newFutarchyDAO.js: ', err)
  }

  async function tryDeploy (contractArtifact, contractName, params = []) {
    const resp = await tryDeployToNetwork(network, contractArtifact, contractName, params)
    return resp
  }
}
