// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev 存款接口
 */
interface DepositeProxy {
    function depositETH(uint32 _l2Gas, bytes memory _data) external payable;
}
