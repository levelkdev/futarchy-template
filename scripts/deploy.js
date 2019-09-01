const _ = require('lodash')

const deployTemplate = require('dao-templates/shared/scripts/deploy-template')
const { APPS } = require('dao-templates/shared/helpers/apps')
const { OPEN_APPS } = require('../helpers/openApps')

const TEMPLATE_NAME = 'futarchy-template'
const CONTRACT_NAME = 'FutarchyTemplate'

const Futarchy = artifacts.require('Futarchy')
const DecisionLib = artifacts.require('DecisionLib')

module.exports = async (callback) => {
  const decisionLib = await DecisionLib.new()
  await Futarchy.link('DecisionLib', decisionLib.address);

  deployTemplate(web3, artifacts, TEMPLATE_NAME, CONTRACT_NAME, _.concat(APPS, OPEN_APPS))
    .then(template => {
      console.log(template.address)
      callback()
    })
    .catch(callback)
}
