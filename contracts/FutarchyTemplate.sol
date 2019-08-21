pragma solidity 0.4.24;

import "@aragon/templates-shared/contracts/BaseTemplate.sol";

contract FutarchyTemplate is BaseTemplate {
  constructor(DAOFactory _daoFactory, ENS _ens, MiniMeTokenFactory _miniMeFactory, IFIFSResolvingRegistrar _aragonID)
  BaseTemplate(_daoFactory, _ens, _miniMeFactory, _aragonID)
    public
  {
    _ensureAragonIdIsValid(_aragonID);
    _ensureMiniMeFactoryIsValid(_miniMeFactory);
  }
}
