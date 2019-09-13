const { hash: namehash } = require('eth-ens-namehash')

const OPEN_APPS = [
  { name: 'futarchy', contractName: 'Futarchy', openApm: true, libs: ['DecisionLib'] },
  { name: 'oracle-manager', contractName: 'OracleManager', openApm: true }
]

const OPEN_APP_IDS = OPEN_APPS.reduce((ids, { name }) => {
  ids[name] = namehash(`${name}.open.aragonpm.eth`)
  return ids
}, {})

module.exports = {
  OPEN_APPS,
  OPEN_APP_IDS,
}
