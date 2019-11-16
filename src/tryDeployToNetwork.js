const fs = require('fs')

const tryDeployToNetwork = async (network, contractArtifact, contractName, params = []) => {
  let contractInstance
  if (network == 'rpc') {
    contractInstance = await deployContract(contractArtifact, contractName, params) 
  } else {
    const deployConfig = readDeployConfig(network)
    const deployedAddress = deployConfig.dependencyContracts[contractName]
    if (!deployedAddress) {
      contractInstance = await deployContract(contractArtifact, contractName, params)
      deployConfig.dependencyContracts[contractName] = contractInstance.address
      writeDeployConfig(network, deployConfig)
    } else {
      contractInstance = await contractArtifact.at(deployedAddress)
      console.log(`${contractName} already deployed: ${deployedAddress}`)
    }
  }
  return contractInstance
}

async function deployContract(contractArtifact, contractName, params) {
  console.log(`Deploying ${contractName}...`)
  const contractInstance = await contractArtifact.new.apply(null, params)
  console.log(`Deployed ${contractName}: ${contractInstance.address}`)
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
