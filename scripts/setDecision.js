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

    const resultText = process.argv[8]
    if (resultText !== 'YES' && resultText !== 'NO') {
      throw new Error(`Invalid result ${resultText}`)
    }
    
    const Futarchy = artifacts.require('Futarchy')
    const SettableDecisionMarkets = artifacts.require('SettableDecisionMarkets')

    const futarchyAppAddress = process.argv[6]
    const decisionId = process.argv[7]
    const decisionResult = resultText == 'YES' ? 0 : 1

    console.log('futarchy app: ', futarchyAppAddress)
    console.log('DecisionID: ', decisionId)
    console.log('Result: ', decisionResult)

    const futarchyApp = Futarchy.at(futarchyAppAddress)
    const decisionMarketsAddress = (await futarchyApp.decisions(decisionId))[0]
    if (decisionMarketsAddress == '0x0000000000000000000000000000000000000000') {
      throw new Error(`Decision ${decisionId} does not exist`)
    }

    const settableDecisionMarkets = SettableDecisionMarkets.at(decisionMarketsAddress)
    
    console.log(`Setting ${resultText}:${decisionResult} on SettableDecisionMarkets:<${decisionMarketsAddress}>...`)
    const setExternalOutcomeTx = await settableDecisionMarkets.setExternalOutcome(decisionResult)
    console.log('Decision set: ', setExternalOutcomeTx.tx)
    console.log('')

    console.log(`Calling Futarchy.transitionDecision(${decisionId}) to set final decision outcome...`)
    const transitionDecisionTx = await futarchyApp.transitionDecision(decisionId)
    console.log('Decision transitioned: ', transitionDecisionTx.tx)
    console.log('')

    const finalOutcome = await settableDecisionMarkets.getOutcome()
    console.log('getOutcome(): ', finalOutcome.toNumber())
    const isOutcomeSet = await settableDecisionMarkets.isOutcomeSet()
    console.log('isOutcomeSet(): ', isOutcomeSet)
    console.log('')

  } catch (err) {
    console.log('Error in scripts/setDecision.js: ', err)
  }
}
