const fs = require('fs')

const tryDeployToNetwork = async (network, contractArtifact, contractName, params = []) => {
  const deployConfig = readDeployConfig(network)
  let contractInstance
  const deployedAddress = deployConfig.dependencyContracts[contractName]
  if (!deployedAddress) {
    console.log(`Deploying ${contractName}...`)
    contractInstance = await contractArtifact.new.apply(null, params)
    console.log(`Deployed ${contractName}: ${contractInstance.address}`)
    deployConfig.dependencyContracts[contractName] = contractInstance.address
    writeDeployConfig(network, deployConfig)
  } else {
    contractInstance = await contractArtifact.at(deployedAddress)
    console.log(`${contractName} already deployed: ${deployedAddress}`)
  }
  return contractInstance
}

function writeDeployConfig (network, deployConfig) {
  fs.writeFileSync(
    `deploy.${network}.json`,
    JSON.stringify(deployConfig, null, 4)
  )
}

function readDeployConfig (network) {
  try {
    let contents = fs.readFileSync(`deploy.${network}.json`)
    return JSON.parse(contents)
  } catch (err) {
    console.log(`No existing deploy.${network}.json file found`)
  }
}

module.exports = tryDeployToNetwork
