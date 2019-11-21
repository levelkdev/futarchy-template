const web3Utils = require('web3-utils')

function numberToBytes32 (number) {
  const hex = web3Utils.toHex(toNumberString(number))
  return web3Utils.padLeft(hex, 64)
}

function addressToBytes32 (address) {
  return web3Utils.padLeft(address, 64)
}

function toNumberString(n) {
  return n.toLocaleString('fullwide', {useGrouping:false})
}

module.exports = {
  numberToBytes32,
  addressToBytes32
}
