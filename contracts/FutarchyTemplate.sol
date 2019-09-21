pragma solidity 0.4.24;

import "futarchy-app/contracts/Futarchy.sol";
import "futarchy-app/contracts/Oracles/MedianPriceOracleFactory.sol";
import "oracle-manager-app/contracts/OracleManager.sol";
import "@aragon/templates-shared/contracts/TokenCache.sol";
import "@aragon/templates-shared/contracts/BaseTemplate.sol";
import "./MedianPriceOracleFactoryProxy.sol";

contract FutarchyTemplate is BaseTemplate, TokenCache {

  event MedianPriceOracleFactoryDeployed(MedianPriceOracleFactory medianPriceOracleFactory);

  // futarchy.open.aragonpm.eth
  bytes32 constant internal FUTARCHY_APP_ID = 0xe1103655b21eaf74209e26bc58ee715bc639ce36e18741f2ce83d3210a785186;
  
  // oracle-manager.open.aragonpm.eth
  bytes32 constant internal ORACLE_MANAGER_APP_ID = 0xe4bb4b1d055158b9259fa4cf33f50aa4f578dadcbf30d9b517db7430918daf8f;

  string constant private ERROR_EMPTY_HOLDERS = "COMPANY_EMPTY_HOLDERS";
  string constant private ERROR_BAD_HOLDERS_STAKES_LEN = "COMPANY_BAD_HOLDERS_STAKES_LEN";
  string constant private ERROR_BAD_VOTE_SETTINGS = "COMPANY_BAD_VOTE_SETTINGS";

  bool constant private TOKEN_TRANSFERABLE = true;
  uint8 constant private TOKEN_DECIMALS = uint8(18);
  uint256 constant private TOKEN_MAX_PER_ACCOUNT = uint256(0);

  MedianPriceOracleFactory medianPriceOracleFactoryMaster;

  constructor(
    DAOFactory _daoFactory,
    ENS _ens,
    MiniMeTokenFactory _miniMeFactory,
    IFIFSResolvingRegistrar _aragonID
  )
    BaseTemplate(_daoFactory, _ens, _miniMeFactory, _aragonID)
    public
  {
    _ensureAragonIdIsValid(_aragonID);
    _ensureMiniMeFactoryIsValid(_miniMeFactory);

    medianPriceOracleFactoryMaster = new MedianPriceOracleFactory(address(0), 0);
  }

  /**
  * @dev Create a new MiniMe token and deploy a Company DAO. This function does not allow Payroll
  *      to be setup due to gas limits.
  * @param _tokenName String with the name for the token used by share holders in the organization
  * @param _tokenSymbol String with the symbol for the token used by share holders in the organization
  * @param _id String with the name for org, will assign `[id].aragonid.eth`
  * @param _holders Array of token holder addresses
  * @param _stakes Array of token stakes for holders (token has 18 decimals, multiply token amount `* 10^18`)
  * @param _votingSettings Array of [supportRequired, minAcceptanceQuorum, voteDuration] to set up the voting app of the organization
  * @param _futarchySettings Array of [futarchyFee, futarchyTradingPeriod, futarchyTimeToPriceResolution, futarchyMarketFundAmount, futarchyToken, futarchyOracleFactory, lmsrMarketMaker] to set up the futarchy app of the organization
  * @param _medianPriceOracleTimeframe Timeframe when median price will be calculated for futarchy market resolution. Medianizing of price data starts at ((startDate + futarchyTimeToPriceResolution) - _medianPriceOracleTimeframe) and ends at (startDate + futarchyTimeToPriceResolution), where "startDate" is futarchy market creation time.
  */
  function newTokenAndInstance(
    string _tokenName,
    string _tokenSymbol,
    string _id,
    address[] _holders,
    uint256[] _stakes,
    uint64[3] _votingSettings,
    bytes32[7] _futarchySettings,
    address[] _oracleManagerDataFeedSources,
    uint _medianPriceOracleTimeframe
  )
    external
  {
    newToken(_tokenName, _tokenSymbol);
    newInstance(_id, _holders, _stakes, _votingSettings, _futarchySettings, _oracleManagerDataFeedSources, _medianPriceOracleTimeframe);
  }

  /**
  * @dev Deploy a Company DAO using a previously cached MiniMe token
  * @param _id String with the name for org, will assign `[id].aragonid.eth`
  * @param _holders Array of token holder addresses
  * @param _stakes Array of token stakes for holders (token has 18 decimals, multiply token amount `* 10^18`)
  * @param _votingSettings Array of [supportRequired, minAcceptanceQuorum, voteDuration] to set up the voting app of the organization
  * @param _futarchySettings Array of [futarchyFee, futarchyTradingPeriod, futarchyTimeToPriceResolution, futarchyMarketFundAmount, futarchyToken, futarchyOracleFactory, lmsrMarketMaker] to set up the futarchy app of the organization
  */
  function newInstance(
    string memory _id,
    address[] memory _holders,
    uint256[] memory _stakes,
    uint64[3] memory _votingSettings,
    bytes32[7] memory _futarchySettings,
    address[] _oracleManagerDataFeedSources,
    uint _medianPriceOracleTimeframe
  )
    public
  {
    _ensureSettings(_holders, _stakes, _votingSettings, _futarchySettings, _oracleManagerDataFeedSources);

    (Kernel dao, ACL acl) = _createDAO();
    Voting voting = _setupBaseApps(dao, acl, _holders, _stakes, _votingSettings);

    // deploy the Oracle Manager app
    OracleManager oracleManager = _setupOracleManagerApp(dao, acl, voting, _oracleManagerDataFeedSources);

    // deploy a MedianPriceOracleFactory with the OracleManager set as it's price data feed
    MedianPriceOracleFactory medianPriceOracleFactory = _deployMedianPriceOracleFactory(oracleManager, _medianPriceOracleTimeframe);

    // deploy the Futarchy app with the MedianPriceOracleFactory set as it's price oracle. All decision
    // markets will be resolved with medianized price data from the OracleManager.
    _setupFutarchyApp(dao, acl, voting, _futarchySettings, medianPriceOracleFactory);

    _transferRootPermissionsFromTemplateAndFinalizeDAO(dao, voting);
    _registerID(_id, dao);
  }

  /**
  * @dev Create a new MiniMe token and cache it for the user
  * @param _name String with the name for the token used by share holders in the organization
  * @param _symbol String with the symbol for the token used by share holders in the organization
  */
  function newToken(string memory _name, string memory _symbol) public returns (MiniMeToken) {
    MiniMeToken token = _createToken(_name, _symbol, TOKEN_DECIMALS);
    _cacheToken(token, msg.sender);
    return token;
  }

  function _setupBaseApps(
    Kernel _dao,
    ACL _acl,
    address[] memory _holders,
    uint256[] memory _stakes,
    uint64[3] memory _votingSettings
  )
    internal
    returns (Voting)
  {
    MiniMeToken token = _popTokenCache(msg.sender);
    TokenManager tokenManager = _installTokenManagerApp(_dao, token, TOKEN_TRANSFERABLE, TOKEN_MAX_PER_ACCOUNT);
    Voting voting = _installVotingApp(_dao, token, _votingSettings);

    _mintTokens(_acl, tokenManager, _holders, _stakes);
    
    _createEvmScriptsRegistryPermissions(_acl, voting, voting);
    _createVotingPermissions(_acl, voting, voting, tokenManager, voting);
    _createTokenManagerPermissions(_acl, tokenManager, voting, voting);

    return voting;
  }

  function _setupFutarchyApp(
    Kernel _dao,
    ACL _acl,
    Voting _voting,
    bytes32[7] _futarchySettings,
    MedianPriceOracleFactory _medianPriceOracleFactory
  )
    internal
  {
    Futarchy futarchy = _installFutarchyApp(_dao, _futarchySettings, _medianPriceOracleFactory);
    _createFutarchyPermissions(_acl, futarchy, _voting, _voting);
  }

  function _setupOracleManagerApp(
    Kernel _dao,
    ACL _acl,
    Voting _voting,
    address[] _oracleManagerDataFeedSources
  )
    internal
    returns (OracleManager)
  {
    OracleManager oracleManager = _installOracleManagerApp(_dao, _oracleManagerDataFeedSources);
    _createOracleManagerPermissions(_acl, oracleManager, _voting, _voting);
    return oracleManager;
  }

  function _installFutarchyApp(
    Kernel _dao,
    bytes32[7] _futarchySettings,
    MedianPriceOracleFactory _medianPriceOracleFactory
  )
    internal
    returns (Futarchy)
  {
    bytes memory initializeData = abi.encodeWithSelector(
      Futarchy(0).initialize.selector,
      uint24(_futarchySettings[0]), // fee
      uint(_futarchySettings[1]), // tradingPeriod
      uint(_futarchySettings[2]), // timeToPriceResolution
      uint(_futarchySettings[3]), // marketFundAmount
      ERC20Gnosis(address(_futarchySettings[4])), // token
      FutarchyOracleFactory(address(_futarchySettings[5])), // futarchyOracleFactory
      IScalarPriceOracleFactory(_medianPriceOracleFactory), // priceOracleFactory
      LMSRMarketMaker(address(_futarchySettings[6])) // lmsrMarketMaker
    );
    
    return Futarchy(_installNonDefaultApp(_dao, FUTARCHY_APP_ID, initializeData));
  }

  function _installOracleManagerApp(
    Kernel _dao,
    address[] _oracleManagerDataFeedSources
  )
    internal
    returns (OracleManager)
  {
    bytes4 initializeSelector = bytes4(keccak256("initialize(address[],address)"));
    bytes memory initializeData = abi.encodeWithSelector(initializeSelector, _oracleManagerDataFeedSources, address(0));
    return OracleManager(_installNonDefaultApp(_dao, ORACLE_MANAGER_APP_ID, initializeData));
  }

  function _createFutarchyPermissions(
    ACL _acl,
    Futarchy _futarchy,
    address _grantee,
    address _manager
  )
    internal
  {
    _acl.createPermission(_grantee, _futarchy, _futarchy.CREATE_DECISION_ROLE(), _manager);
  }

  function _createOracleManagerPermissions(
    ACL _acl,
    OracleManager _oracleManager,
    address _grantee,
    address _manager
  )
    internal
  {
    _acl.createPermission(_grantee, _oracleManager, _oracleManager.MANAGE_DATA_FEEDS(), _manager);
  }

  function _deployMedianPriceOracleFactory(
    OracleManager _oracleManager,
    uint _medianPriceOracleTimeframe
  )
    internal
    returns (MedianPriceOracleFactory)
  {
    MedianPriceOracleFactory medianPriceOracleFactory = MedianPriceOracleFactory(
      new MedianPriceOracleFactoryProxy(
        address(_oracleManager),
        _medianPriceOracleTimeframe,
        address(medianPriceOracleFactoryMaster)
      )
    );
    emit MedianPriceOracleFactoryDeployed(medianPriceOracleFactory);
    return medianPriceOracleFactory;
  }

  function _ensureSettings(
    address[] memory _holders,
    uint256[] memory _stakes,
    uint64[3] memory _votingSettings,
    bytes32[7] memory _futarchySettings,
    address[] _oracleManagerDataFeedSources
  )
    private
    pure
  {
    require(_holders.length > 0, ERROR_EMPTY_HOLDERS);
    require(_holders.length == _stakes.length, ERROR_BAD_HOLDERS_STAKES_LEN);
    require(_votingSettings.length == 3, ERROR_BAD_VOTE_SETTINGS);
    // TODO: verify futarchy settings
    // TODO: verify oracle manater settings
  }
}
