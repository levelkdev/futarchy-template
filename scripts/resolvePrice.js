const formatDateTime = require('../src/formatDateTime')

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

    const futarchyApp = Futarchy.at(futarchyAppAddress)
    const decisionMarketsAddress = (await futarchyApp.decisions(decisionId))[0]
    if (decisionMarketsAddress == '0x0000000000000000000000000000000000000000') {
      throw new Error(`Decision ${decisionId} does not exist`)
    }

    const settableDecisionMarkets = SettableDecisionMarkets.at(decisionMarketsAddress)

    const isOutcomeSet = await settableDecisionMarkets.isOutcomeSet()
    if (!isOutcomeSet) {
      throw new Error(`Outcome not set for SettableDecisionMarkets:<${settableDecisionMarkets.address}>. Use "npm run setDecision" to set the outcome`)
    }

    const decisionOutcome = await settableDecisionMarkets.getOutcome()
    const winningMarket = Market.at(await settableDecisionMarkets.getMarketByIndex(decisionOutcome))
    const winningEvent = Event.at(await winningMarket.eventContract())
    const winningOutcomeSet = await winningEvent.isOutcomeSet()
    if(winningOutcomeSet) {
      throw new Error(`Outcome already set for winning ${decisionOutcome.toNumber() == 0 ? 'YES' : 'NO'} market.`)
    }

    const medianPriceOracle = MedianPriceOracle.at(await winningEvent.oracle())
    const priceOutcomeSet = await medianPriceOracle.isOutcomeSet()
    if (priceOutcomeSet) {
      const priceOutcome = await medianPriceOracle.getOutcome()
      throw new Error(`Price outcome already set to ${priceOutcome.toNumber()}`)
    }

    const resolutionDate = (await medianPriceOracle.resolutionDate()).toNumber()
    const medianStartDate = (await medianPriceOracle.medianStartDate()).toNumber()
    const now = (await web3.eth.getBlock('latest')).timestamp
    if (resolutionDate >= now) {
      throw new Error(`Resolution date ${verboseBlocktime(resolutionDate)} has not passed current blocktime ${verboseBlocktime(now)}`)
    }
    
    const timeMedianDataFeed = TimeMedianDataFeed.at(await medianPriceOracle.medianDataFeed())
    const results = await getAllResults(timeMedianDataFeed)

    const validRange = getValidRange(results, resolutionDate, medianStartDate)
    const isValidRange = await medianPriceOracle.isValidRange(validRange[0], validRange[1])
    if (!isValidRange) {
      throw new Error(`Calculated range [${validRange[0]}, ${validRange[1]}] was not valid`)
    }

    console.log(`Setting outcome for MedianPriceOracle:<${medianPriceOracle.address}> from startIndex:${validRange[0]} to endIndex:${validRange[1]}`)
    const setOutcomeTx = await medianPriceOracle.setOutcome(validRange[0], validRange[1])
    console.log('tx: ', setOutcomeTx.tx)
    console.log('')

    const outcome = (await medianPriceOracle.getOutcome()).toNumber()
    console.log(`MedianPriceOracle:<${medianPriceOracle.address}> outcome: ${outcome}`)
    console.log('')

  } catch (err) {
    console.log('Error in scripts/resolvePrice.js: ', err)
  }
}

// TODO: handle edge case where no results were logged
function getValidRange (_results, _resolutionDate, _medianStartDate) {
  let lowerBound, upperBound
  for (var i in _results) {
    const result = _results[i]
    if (result.date > _medianStartDate && !lowerBound) {
      lowerBound = result.index
    }
    if (result.date > _resolutionDate && !upperBound) {
      upperBound = result.index - 1
    }
  }
  return [lowerBound, upperBound]
}

async function getAllResults(_timeMedianDataFeed) {
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
