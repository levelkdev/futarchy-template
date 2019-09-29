const _ = require('lodash')

const deployTemplate = require('dao-templates/shared/scripts/deploy-template')
const { APPS } = require('dao-templates/shared/helpers/apps')
const { OPEN_APPS } = require('../helpers/openApps')

const TEMPLATE_NAME = 'futarchy-template'
const CONTRACT_NAME = 'FutarchyTemplate'

module.exports = async (
  callback,
  {
    web3: _web3,
    artifacts: _artifacts
  } = {}
) => {
  if (!this.web3) web3 = _web3
  if (!this.artifacts) artifacts = _artifacts

  return deployTemplate(web3, artifacts, TEMPLATE_NAME, CONTRACT_NAME, _.concat(APPS, OPEN_APPS))
    .then(template => {
      console.log(template.address)
      if (callback) {
        callback()
      } else {
        return template.address
      }
    })
    .catch(callback)
}
