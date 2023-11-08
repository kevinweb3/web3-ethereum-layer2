// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev 取款接口
 */
interface WithdrawProxy {
    function withdraw(
        address _l2Token,
        uint256 _amount,
        uint32 _l1Gas,
        bytes memory _data
    ) external payable;
}
