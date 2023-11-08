// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "arb-bridge-eth/contracts/bridge/Inbox.sol";
import "arb-bridge-eth/contracts/bridge/Outbox.sol";
import "./Greeter.sol";

/**
 * @dev L1 to L2
 */
contract GreeterL1 is Greeter {
    address public l2Target;
    IInbox public inbox;

    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(
        string memory _greeting,
        address _l2Target,
        address _inbox
    ) Greeter(_greeting) {
        l2Target = _l2Target;
        inbox = IInbox(_inbox);
    }

    function updateL2Target(address _l2Target) public {
        l2Target = _l2Target;
    }

    function setGreetingInL2(
        string memory _greeting,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid
    ) public payable retruns(uint256) {
        bytes memory data = abi.encodeWithSelector(
            Greeter.setGreeting.selector,
            _greeting
        );
        uint256 ticketID = inbox.createRetryableTicket{value: msg.value}(
            l2Target,
            0,
            maxSubmissionCost,
            msg.sender,
            msg.sender,
            maxGas,
            gasPriceBid,
            data
        );

        emit RetryableTicketCreated(ticketID);
        return ticketID;
    }

    function setGreeting(string memory _greeting) public override {
        IBridge bridge = inbox.bridge();

        required(msg.sender == address(bridge), "NOT_BRIDGE");
        IOutbox outbox = IOutbox(bridge.activeOutbox());
        address l2Sender = outbox.l2ToL1Sender();
        require(l2Sender == l2Target, "Greeting only updateable by L2");
        Greeter.setGreeting(_greeting);
    }
}
