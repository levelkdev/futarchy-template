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

    const OracleManager = artifacts.require('OracleManager')
    const TokenPriceDataFeed = artifacts.require('TokenPriceDataFeed')
    const Token = artifacts.require('ERC20Detailed')

    const oracleManagerAppAddress = process.argv[6]
    const oracleManager = OracleManager.at(oracleManagerAppAddress)

    const now = (await web3.eth.getBlock('latest')).timestamp

    console.log('Latest block timestamp: ', verboseBlocktime(now))
    console.log('')

    console.log(`Oracle Manager App: ${oracleManager.address}`)
    console.log(`=========`)
    console.log('')

    const dataFeedAddresses = await getDataFeedAddresses(oracleManager)
    console.log('Data Feeds:')
    for (var i in dataFeedAddresses) {
      // assuming that these are all TokenPriceDataFeed instances for now,
      // but that might not always be the case
      const tokenPriceDataFeed = TokenPriceDataFeed.at(dataFeedAddresses[i])
      const token1Address = await tokenPriceDataFeed.token1()
      const token2Address = await tokenPriceDataFeed.token2()
      const exchangeAdapterAddress = await tokenPriceDataFeed.exchangeAdapter()
      const token1 = Token.at(token1Address)
      const token2 = Token.at(token2Address)
      const token1Symbol = await tryGetSymbol(token1)
      const token2Symbol = await tryGetSymbol(token2)
      const currentPrice = bytes32ToNum(web3, await tokenPriceDataFeed.viewCurrentResult()) / 10**18
      console.log(`  ${i}: TokenPriceDataFeed:<${tokenPriceDataFeed.address}>`)
      console.log(`    Token Pair: ${token1Address}-${token1Symbol} | ${token2Address}-${token2Symbol}`)
      console.log(`    Exchange Adapter: ${exchangeAdapterAddress}`)
      console.log(`    Current Exchange Price: ${currentPrice}`)
      logDataFeedResults(await getDataFeedResults(web3, tokenPriceDataFeed))

      
    }

  } catch (err) {
    console.log('Error in scripts/oracleManagerReport.js: ', err)
  }
}

async function tryGetSymbol (token) {
  try {
    const symbol = await token.symbol()
    return symbol
  } catch (err) {
    return '(Unknown)'
  }
}

async function getDataFeedAddresses(_oracleManager) {
  return new Promise((resolve, reject) => {
    _oracleManager.AddedDataFeed(
      {},
      { fromBlock: 0, toBlock: 'latest' }
    ).get((err, res) => {
      if (err) {
        reject(err)
      }
      try {
        let dataFeeds = []
        for (var i in res) {
          dataFeeds.push(res[i].args.dataFeed)
        }
        resolve(dataFeeds)
      } catch (implErr) {
        reject(implErr)
      }
    })
  })
}

function logDataFeedResults (_results) {
  console.log(`    Logged Results:`)
  for (var i in _results) {
    const result = _results[i]
    console.log(`      ${result.index} | ${verboseBlocktime(result.date)} | ${result.sender} | ${result.price}`)
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
