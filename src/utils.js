const web3Utils = require('web3-utils')

function numberToBytes32 (number) {
  const hex = web3Utils.toHex(number)
  return web3Utils.padLeft(hex, 64)
}

function addressToBytes32 (address) {
  return web3Utils.padLeft(address, 64)
}

module.exports = {
  numberToBytes32,
  addressToBytes32
}
