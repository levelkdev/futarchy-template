const deploy = require('./deploy')
const newFutarchyDAO = require('./newFutarchyDAO')

module.exports = async (callback) => {
  try {
    const templateAddress = await deploy(undefined, { web3, artifacts })
    await newFutarchyDAO(undefined, { web3, artifacts, templateAddress })
  } catch (err) {
    console.log('Error in scripts/runLocal.js: ', err)
  }
  callback()
}