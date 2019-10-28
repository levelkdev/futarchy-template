module.exports = function bytes32ToNum(web3, bytes32str) {
  bytes32str = bytes32str.replace(/^0x/, '');
  while (bytes32str[0] == 0) {
    bytes32str = bytes32str.substr(1)
  }
  var bn = web3.toDecimal('0x' + bytes32str, 16);
  return bn
}
