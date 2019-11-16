const fs = require('fs')

const readConfig = (network) => {
  let networkName = network == 'rpc' ? 'local' : network
  let config = fs.readFileSync(`config.${networkName}.json`)
  return JSON.parse(config)
}

module.exports = readConfig
