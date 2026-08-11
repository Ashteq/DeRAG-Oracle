// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IERC165 Standard Interface Detection
/// @notice Standard interface for checking supported interface IDs
interface IERC165 {
    /// @notice Query if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @return bool True if the contract implements `interfaceId`
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/// @title IReceiver Interface for Chainlink Consensus Reports
/// @notice Interface required by Chainlink Forwarder to deliver verified off-chain reports
interface IReceiver is IERC165 {
    /// @notice Executed by the Chainlink Forwarder to push verified consensus data
    /// @param metadata Cryptographic or routing metadata associated with the report
    /// @param report ABI-encoded report payload delivered by the Chainlink DON
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/// @title DeRAGReceiver - On-Chain Oracle Telemetry Settlement Contract
/// @author Akanksha Sharma (DeRAG-Oracle Project)
/// @notice Receives and stores ABI-encoded AI risk analysis payloads delivered by the Chainlink DON.
/// @dev Implements IReceiver and enforces strict access control via the Chainlink Forwarder address.
contract DeRAGReceiver is IReceiver {
    
    /// @notice The latest AI risk report string decoded from Chainlink consensus
    string public latestAiResponse;

    /// @notice Timestamp (in seconds) when the oracle state was last updated
    uint256 public lastUpdatedTimestamp;

    /// @notice Authorized Chainlink Forwarder contract address
    address public forwarder;

    /// @notice Emitted whenever a new AI risk telemetry report is written on-chain
    /// @param newResponse The decoded AI analysis string
    /// @param timestamp Block timestamp of the update
    event AiResponseUpdated(string newResponse, uint256 timestamp);

    /// @notice Deploys the contract and registers the authorized Chainlink Forwarder
    /// @param _forwarder Address of the Chainlink Forwarder contract on target network
    constructor(address _forwarder) {
        require(_forwarder != address(0), "Invalid forwarder address");
        forwarder = _forwarder;
    }

    /// @notice ERC-165 interface support detection
    /// @param interfaceId The interface identifier to test
    /// @return True if `interfaceId` is supported
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    /// @notice Primary ingestion endpoint called exclusively by the authorized Chainlink Forwarder
    /// @dev Decodes ABI-encoded string payload and updates state storage variables
    /// @param report ABI-encoded byte string originating from Chainlink CRE workflow
    function onReport(bytes calldata /* metadata */, bytes calldata report) external override {
        // Enforce access control: reject calls from unauthorized addresses
        require(msg.sender == forwarder, "Caller is not authorized forwarder");

        string memory decodedResponse = abi.decode(report, (string));
        
        latestAiResponse = decodedResponse;
        lastUpdatedTimestamp = block.timestamp;

        emit AiResponseUpdated(decodedResponse, block.timestamp);
    }
}
