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
    if(!winningOutcomeSet) {
      throw new Error(`Outcome not set for winning ${decisionOutcome.toNumber() == 0 ? 'YES' : 'NO'} market. Use "npm run resolvePrice"`)
    }
  } catch (err) {
    console.log('Error in scripts/closeDecision.js: ', err)
  }
}