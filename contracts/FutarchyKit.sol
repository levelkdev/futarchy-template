pragma solidity 0.4.24;

import "@aragon/kits-beta-base/contracts/BetaKitBase.sol";

contract FutarchyKit is BetaKitBase {
    constructor(
        DAOFactory _fac,
        ENS _ens,
        MiniMeTokenFactory _minimeFac,
        IFIFSResolvingRegistrar _aragonID,
        bytes32[4] _appIds
    )
        BetaKitBase(_fac, _ens, _minimeFac, _aragonID, _appIds)
        public
    {
        // solium-disable-previous-line no-empty-blocks
    }
}
