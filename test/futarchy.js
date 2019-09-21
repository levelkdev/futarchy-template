const assertRevert = require('dao-templates/shared/helpers/assertRevert')(web3)
const { numberToBytes32, addressToBytes32 } = require('../src/utils')

const { hash: namehash } = require('eth-ens-namehash')
const { randomId } = require('dao-templates/shared/helpers/aragonId')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { deployedAddresses } = require('dao-templates/shared/lib/arapp-file')(web3)
const { getInstalledAppsById, getInstalledApps } = require('dao-templates/shared/helpers/events')(artifacts)
const { assertRole, assertMissingRole } = require('dao-templates/shared/helpers/assertRole')(web3)
const { OPEN_APP_IDS } = require('../helpers/openApps')

const FutarchyTemplate = artifacts.require('FutarchyTemplate')
const Futarchy = artifacts.require('Futarchy')
const OracleManager = artifacts.require('OracleManager')

const ENS = artifacts.require('ENS')
const ACL = artifacts.require('ACL')
const Kernel = artifacts.require('Kernel')
const Voting = artifacts.require('Voting')
const TokenManager = artifacts.require('TokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')
const PublicResolver = artifacts.require('PublicResolver')
const EVMScriptRegistry = artifacts.require('EVMScriptRegistry')

const ONE_DAY = 60 * 60 * 24
const ONE_WEEK = ONE_DAY * 7

contract('FutarchyTemplate', ([_, owner, holder1, holder2]) => {
  
  let daoID, template, dao, ens
  let voting, tokenManager, token
  let futarchy, oracleManager

  const HOLDERS = [holder1, holder2]
  const STAKES = HOLDERS.map(() => 1e18)
  const TOKEN_NAME = 'Futarchy Token'
  const TOKEN_SYMBOL = 'FUT'

  const VOTE_DURATION = ONE_WEEK
  const SUPPORT_REQUIRED = 50e16
  const MIN_ACCEPTANCE_QUORUM = 5e16
  const VOTING_SETTINGS = [SUPPORT_REQUIRED, MIN_ACCEPTANCE_QUORUM, VOTE_DURATION]
  const FUTARCHY_FEE = 2000
  const FUTARCHY_TRADING_PERIOD = 60 * 60 * 24 * 7
  const FUTARCHY_TIME_TO_PRICE_RESOLUTION = FUTARCHY_TRADING_PERIOD * 2
  const FUTARCHY_MARKET_FUND_AMOUNT = 10 * 10 ** 18
  const FUTARCHY_TOKEN = '0x4f2c50140e85a5fa7c86151487e6b41f63a706e5'
  const FUTARCHY_ORACLE_FACTORY = '0xe53a21d1cb80c8112d12808bc37128bb5e32fcaf'
  const LMSR_MARKET_MAKER = '0xf930779b2f8efc687e690b2aef50e2ea326d4ada'

  const ORACLE_MANAGER_DATA_FEED_SOURCES = [
    '0x4915c406f92cac8df60e22c3a5b1fd15b1cd6fb2',
    '0xdaec71c58228141a7b43f7c59f3dc3c0f1a64eb4'
  ]

  const FUTARCHY_SETTINGS = [
    numberToBytes32(FUTARCHY_FEE),
    numberToBytes32(FUTARCHY_TRADING_PERIOD),
    numberToBytes32(FUTARCHY_TIME_TO_PRICE_RESOLUTION),
    numberToBytes32(FUTARCHY_MARKET_FUND_AMOUNT),
    addressToBytes32(FUTARCHY_TOKEN),
    addressToBytes32(FUTARCHY_ORACLE_FACTORY),
    addressToBytes32(LMSR_MARKET_MAKER)
  ]

  const MEDIAN_PRICE_ORACLE_TIMEFRAME = 60 * 60 * 24

  before('fetch futarchy template and ENS', async () => {
    const { registry, address } = await deployedAddresses()
    ens = ENS.at(registry)
    template = FutarchyTemplate.at(address)
  })

  const loadDAO = async (tokenReceipt, instanceReceipt) => {
    dao = Kernel.at(getEventArgument(instanceReceipt, 'DeployDao', 'dao'))
    token = MiniMeToken.at(getEventArgument(tokenReceipt, 'DeployToken', 'token'))
    acl = ACL.at(await dao.acl())
    const installedApps = getInstalledAppsById(instanceReceipt)
    const installedOpenApps = getInstalledOpenApps(instanceReceipt)

    assert.equal(dao.address, getEventArgument(instanceReceipt, 'SetupDao', 'dao'), 'should have emitted a SetupDao event')
    
    assert.equal(installedApps.voting.length, 1, 'should have installed 1 voting app')
    voting = Voting.at(installedApps.voting[0])

    assert.equal(installedApps['token-manager'].length, 1, 'should have installed 1 token manager app')
    tokenManager = TokenManager.at(installedApps['token-manager'][0])

    assert.equal(installedOpenApps['futarchy'].length, 1, 'should have installed 1 futarchy app')
    futarchy = Futarchy.at(installedOpenApps['futarchy'][0])

    assert.equal(installedOpenApps['oracle-manager'].length, 1, 'should have installed 1 oracle-manager app')
    oracleManager = OracleManager.at(installedOpenApps['oracle-manager'][0])
  }

  const testDAOSetup = () => {
    it('registers a new DAO on ENS', async () => {
      const aragonIdNameHash = namehash(`${daoID}.aragonid.eth`)
      const resolvedAddress = await PublicResolver.at(await ens.resolver(aragonIdNameHash)).addr(aragonIdNameHash)
      assert.equal(resolvedAddress, dao.address, 'aragonId ENS name does not match')
    })

    it('creates a new token', async () => {
      assert.equal(await token.name(), TOKEN_NAME)
      assert.equal(await token.symbol(), TOKEN_SYMBOL)
      assert.equal(await token.transfersEnabled(), true)
      assert.equal((await token.decimals()).toString(), 18)
    })

    it('mints requested amounts for the holders', async () => {
      assert.equal((await token.totalSupply()).toString(), STAKES.reduce((a, b) => a + b))
      for (const holder of HOLDERS) assert.equal((await token.balanceOf(holder)).toString(), STAKES[HOLDERS.indexOf(holder)])
    })

    it('should have voting app correctly setup', async () => {
      assert.isTrue(await voting.hasInitialized(), 'voting not initialized')
      assert.equal((await voting.supportRequiredPct()).toString(), SUPPORT_REQUIRED)
      assert.equal((await voting.minAcceptQuorumPct()).toString(), MIN_ACCEPTANCE_QUORUM)
      assert.equal((await voting.voteTime()).toString(), VOTE_DURATION)

      await assertRole(acl, voting, voting, 'CREATE_VOTES_ROLE', tokenManager)
      await assertRole(acl, voting, voting, 'MODIFY_QUORUM_ROLE')
      await assertRole(acl, voting, voting, 'MODIFY_SUPPORT_ROLE')
    })

    it('should have token manager app correctly setup', async () => {
      assert.isTrue(await tokenManager.hasInitialized(), 'token manager not initialized')
      assert.equal(await tokenManager.token(), token.address)

      await assertRole(acl, tokenManager, voting, 'MINT_ROLE')
      await assertRole(acl, tokenManager, voting, 'BURN_ROLE')

      await assertMissingRole(acl, tokenManager, 'ISSUE_ROLE')
      await assertMissingRole(acl, tokenManager, 'ASSIGN_ROLE')
      await assertMissingRole(acl, tokenManager, 'REVOKE_VESTINGS_ROLE')
    })

    it('should have futarchy app correctly setup', async () => {
      assert.equal((await futarchy.fee()).toString(), FUTARCHY_FEE)
      assert.equal((await futarchy.tradingPeriod()).toString(), FUTARCHY_TRADING_PERIOD)
      assert.equal((await futarchy.timeToPriceResolution()).toString(), FUTARCHY_TIME_TO_PRICE_RESOLUTION)
      assert.equal((await futarchy.marketFundAmount()).toString(), FUTARCHY_MARKET_FUND_AMOUNT)
      assert.equal((await futarchy.token()).toString(), FUTARCHY_TOKEN)
      assert.equal((await futarchy.futarchyOracleFactory()).toString(), FUTARCHY_ORACLE_FACTORY)
      
      // TODO: this should be the factory deployed by the template...
      // assert.equal((await futarchy.priceOracleFactory()).toString(), PRICE_ORACLE_FACTORY)
      
      assert.equal((await futarchy.lmsrMarketMaker()).toString(), LMSR_MARKET_MAKER)

      await assertRole(acl, futarchy, voting, 'CREATE_DECISION_ROLE')
    })

    it('should have oracle-manager app correctly setup', async () => {
      assert.isTrue(await oracleManager.approvedDataFeeds(
        ORACLE_MANAGER_DATA_FEED_SOURCES[0]),
        `dataFeed ${ORACLE_MANAGER_DATA_FEED_SOURCES[0]} should be approved`
      )

      assert.isTrue(await oracleManager.approvedDataFeeds(
        ORACLE_MANAGER_DATA_FEED_SOURCES[1]),
        `dataFeed ${ORACLE_MANAGER_DATA_FEED_SOURCES[1]} should be approved`
      )

      await assertRole(acl, oracleManager, voting, 'MANAGE_DATA_FEEDS')
    })

    it('sets up DAO and ACL permissions correctly', async () => {
      await assertRole(acl, dao, voting, 'APP_MANAGER_ROLE')
      await assertRole(acl, acl, voting, 'CREATE_PERMISSIONS_ROLE')
    })

    it('sets up EVM scripts registry permissions correctly', async () => {
      const reg = await EVMScriptRegistry.at(await acl.getEVMScriptRegistry())
      await assertRole(acl, reg, voting, 'REGISTRY_ADD_EXECUTOR_ROLE')
      await assertRole(acl, reg, voting, 'REGISTRY_MANAGER_ROLE')
    })
  }

  context('creating instances with a single transaction', () => {
    context('when the creation fails', () => {
      it('reverts when no holders were given', async () => {
        await assertRevert(template.newTokenAndInstance(TOKEN_NAME, TOKEN_SYMBOL, randomId(), [], [], VOTING_SETTINGS, FUTARCHY_SETTINGS, ORACLE_MANAGER_DATA_FEED_SOURCES, MEDIAN_PRICE_ORACLE_TIMEFRAME), 'COMPANY_EMPTY_HOLDERS')
      })

      it('reverts when holders and stakes length do not match', async () => {
        await assertRevert(template.newTokenAndInstance(TOKEN_NAME, TOKEN_SYMBOL, randomId(), [holder1], STAKES, VOTING_SETTINGS, FUTARCHY_SETTINGS, ORACLE_MANAGER_DATA_FEED_SOURCES, MEDIAN_PRICE_ORACLE_TIMEFRAME), 'COMPANY_BAD_HOLDERS_STAKES_LEN')
        await assertRevert(template.newTokenAndInstance(TOKEN_NAME, TOKEN_SYMBOL, randomId(), HOLDERS, [1e18], VOTING_SETTINGS, FUTARCHY_SETTINGS, ORACLE_MANAGER_DATA_FEED_SOURCES, MEDIAN_PRICE_ORACLE_TIMEFRAME), 'COMPANY_BAD_HOLDERS_STAKES_LEN')
      })
    })

    context('when the creation succeeds', () => {
      let receipt

      before('create futarchy', async () => {
        daoID = randomId()
        receipt = await template.newTokenAndInstance(TOKEN_NAME, TOKEN_SYMBOL, daoID, HOLDERS, STAKES, VOTING_SETTINGS, FUTARCHY_SETTINGS, ORACLE_MANAGER_DATA_FEED_SOURCES, MEDIAN_PRICE_ORACLE_TIMEFRAME, { from: owner })

        await loadDAO(receipt, receipt)
      })

      testDAOSetup()
    })
  })
})

function getInstalledOpenApps (receipt) {
  return Object.keys(OPEN_APP_IDS).reduce((apps, appName) => {
    apps[appName] = getInstalledApps(receipt, OPEN_APP_IDS[appName])
    return apps
  }, {})
}
