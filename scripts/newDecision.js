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
    const TokenPriceDataFeed = artifacts.require('TokenPriceDataFeed')
    const Token = artifacts.require('ERC20Gnosis')

    const futarchyAppAddress = process.argv[6]
    const priceFeedAddress = process.argv[7]
    const metadata = process.argv[8]
    const executionScript = process.argv[9] || ''
    
    const futarchyApp = Futarchy.at(futarchyAppAddress)
    const priceFeed = TokenPriceDataFeed.at(priceFeedAddress)

    const currentPrice = bytes32ToNum(web3, await priceFeed.viewCurrentResult())
    console.log(`TokenPriceDataFeed:<${priceFeed}>`)
    console.log(`  current price: ${currentPrice/10**18}`)
    console.log()

    const marketFundAmount = (await futarchyApp.marketFundAmount()).toNumber()
    const token = Token.at(await futarchyApp.token())
    console.log(`Approving ${marketFundAmount/10**18} Token:<${token.address}> transfer`)
    const approveTx = await token.approve(futarchyApp.address, marketFundAmount)
    console.log('done: ', approveTx.tx)
    console.log()

    const lowerBound = 0
    const upperBound = currentPrice * 2
    console.log(`Creating new futarchy decision market:`)
    console.log(`  executionScript: ${executionScript}`)
    console.log(`  metadata: ${metadata}`)
    console.log(`  lowerBound: ${lowerBound}`)
    console.log(`  upperBound: ${upperBound}`)
    console.log()

    const tx = await futarchyApp.newDecision(executionScript, metadata, lowerBound, upperBound)
    console.log('done: ', tx.tx)
    console.log()
  } catch (err) {
    console.log('Error in scripts/newDecision.js: ', err)
  }
}
