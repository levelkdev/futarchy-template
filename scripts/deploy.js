require('dotenv').config()
const deploy_ens = require('@aragon/os/scripts/deploy-test-ens.js')
const deploy_apm = require('@aragon/os/scripts/deploy-apm.js')
const deploy_id = require('@aragon/id/scripts/deploy-beta-aragonid.js')
const deploy_kit = require('@aragon/kits-beta-base/scripts/deploy_kit.js')

module.exports = async (callback) => {
  try {
    const owner = process.env.OWNER

    console.log(`Deploying Democracy Kit, Owner ${owner}`)

    // get network
    const network = process.argv[4]

    // ENS
    const { ens } = await deploy_ens(null, { artifacts, web3, owner })

    // APM
    await deploy_apm(null, {artifacts, web3, owner, ensAddress: ens.address })

    // aragonID
    await deploy_id(null, { artifacts, web3, owner, ensAddress: ens.address })

    await deploy_kit(null, { artifacts, owner, kitName: 'futarchy-kit', kitContractName: 'FutarchyKit', network: network, ensAddress: ens.address })

    callback()
  } catch (err) {
    console.log('Error in scripts/deploy.js: ', err)
  }
}
