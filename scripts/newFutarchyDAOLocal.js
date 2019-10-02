const deploy = require('./deploy')
const newFutarchyDAO = require('./newFutarchyDAO')

module.exports = async (callback) => {
  try {
    const templateAddress = '0xfe18bcbedd6f46e0dfbb3aea02090f23ed1c4a28'
    await newFutarchyDAO(undefined, { web3, artifacts, templateAddress })
  } catch (err) {
    console.log('Error in scripts/newFutarchyDAOLocal.js: ', err)
  }
  callback()
}