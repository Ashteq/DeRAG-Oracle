// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

contract DeRAGReceiver is IReceiver {
    string public latestAiResponse;
    uint256 public lastUpdatedTimestamp;
    address public forwarder;

    event AiResponseUpdated(string newResponse, uint256 timestamp);

    // This runs once when you deploy the contract
    constructor(address _forwarder) {
        forwarder = _forwarder;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    // The function Chainlink calls to deliver your AI data
    function onReport(bytes calldata /* metadata */, bytes calldata report) external override {
        
        // For production, you would uncomment this to ensure only the forwarder can call it:
        // require(msg.sender == forwarder, "Caller is not authorized forwarder");

        string memory decodedResponse = abi.decode(report, (string));
        
        latestAiResponse = decodedResponse;
        lastUpdatedTimestamp = block.timestamp;

        emit AiResponseUpdated(decodedResponse, block.timestamp);
    }
}