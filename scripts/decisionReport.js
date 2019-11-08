const formatDateTime = require('../src/formatDateTime')
const bytes32ToNum = require('../src/bytes32ToNum')

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

    const Futarchy = artifacts.require('Futarchy')
    const Market = artifacts.require('Market')
    const Event = artifacts.require('Event')
    const MedianPriceOracle = artifacts.require('MedianPriceOracle')
    const TimeMedianDataFeed = artifacts.require('TimeMedianDataFeed')
    const SettableDecisionMarkets = artifacts.require('SettableDecisionMarkets')

    const futarchyAppAddress = process.argv[6]
    const decisionId = process.argv[7]

    const now = (await web3.eth.getBlock('latest')).timestamp

    console.log('Latest block timestamp: ', verboseBlocktime(now))
    console.log('')

    console.log(`Futarchy App: ${futarchyAppAddress} - Decision ${decisionId}`)
    console.log(`=========`)
    console.log('')

    const futarchyApp = Futarchy.at(futarchyAppAddress)
    const decisionMarketsAddress = (await futarchyApp.decisions(decisionId))[0]
    if (decisionMarketsAddress == '0x0000000000000000000000000000000000000000') {
      throw new Error(`Decision ${decisionId} does not exist`)
    }

    const settableDecisionMarkets = SettableDecisionMarkets.at(decisionMarketsAddress)
    const isOutcomeSet = await settableDecisionMarkets.isOutcomeSet()
    const decisionOutcome = (await settableDecisionMarkets.getOutcome()).toNumber()
    console.log(`SettableDecisionMarkets:<${decisionMarketsAddress}>`)
    console.log(`  Decision Outcome: ${isOutcomeSet ? (decisionOutcome == 0 ? 'YES' : 'NO') : 'Not set'}`)
    console.log()

    if (isOutcomeSet) {
      const winningMarket = Market.at(await settableDecisionMarkets.getMarketByIndex(decisionOutcome))
      const winningEvent = Event.at(await winningMarket.eventContract())
      const winningOutcomeSet = await winningEvent.isOutcomeSet()
      const winningOutcome = (await winningEvent.outcome()).toNumber()
      
      console.log(`Winning Market:<${winningMarket.address}>`)
      console.log(`Winning Event:<${winningEvent.address}>`)
      console.log(`Winning Price Outcome: ${winningOutcomeSet ? winningOutcome : 'Not set'}`)
      console.log()
    }

    const yesMarket = Market.at(await settableDecisionMarkets.getMarketByIndex(0))
    const yesEvent = Event.at(await yesMarket.eventContract())
    const medianPriceOracle = MedianPriceOracle.at(await yesEvent.oracle())
    const resolutionDate = (await medianPriceOracle.resolutionDate()).toNumber()
    const medianStartDate = (await medianPriceOracle.medianStartDate()).toNumber()
    const medianPriceOutcomeSet = await medianPriceOracle.isOutcomeSet()
    const medianPriceOutcome = (await medianPriceOracle.getOutcome()).toNumber()
    console.log(`MedianPriceOracle:<${medianPriceOracle.address}>`)
    console.log(`  resolutionDate: ${verboseBlocktime(resolutionDate)}`)
    console.log(`  medianStartDate: ${verboseBlocktime(medianStartDate)}`)
    console.log(`  Median Price Outcome: ${medianPriceOutcomeSet ? medianPriceOutcome / 10**18 : 'Not set'}`)
    console.log()
    
    const timeMedianDataFeed = TimeMedianDataFeed.at(await medianPriceOracle.medianDataFeed())
    console.log(`TimeMedianDataFeed:<${timeMedianDataFeed.address}>`)
    logDataFeedResults(await getDataFeedResults(web3, timeMedianDataFeed))

  } catch (err) {
    console.log('Error in scripts/decisionReport.js: ', err)
  }
}

function logDataFeedResults (_results) {
  console.log(`  Results:`)
  for (var i in _results) {
    const result = _results[i]
    console.log(`    ${result.index} | ${verboseBlocktime(result.date)} | ${result.sender} | ${result.price}`)
  }
  console.log()
}

async function getDataFeedResults(web3, _timeMedianDataFeed) {
  return new Promise((resolve, reject) => {
    _timeMedianDataFeed.ResultSet(
      {},
      { fromBlock: 0, toBlock: 'latest' }
    ).get((err, res) => {
      if (err) {
        reject(err)
      }
      try {
        let results = []
        for (var i in res) {
          if (res[i].event === 'ResultSet') {
            results.push({
              price: bytes32ToNum(web3, res[i].args._result) / 10**18,
              index: res[i].args._index.toNumber(),
              date: res[i].args._date.toNumber(),
              sender: res[i].args._sender,
            })
          }
        }
        resolve(results)
      } catch (implErr) {
        reject(implErr)
      }
    })
  })
}

function verboseBlocktime (_blocktime) {
  return `<${_blocktime} : ${formatDateTime.full(_blocktime)}>`
}
