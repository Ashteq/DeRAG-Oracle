import { 
  CronCapability, 
  handler, 
  type Runtime, 
  type NodeRuntime,
  HTTPClient,
  EVMClient,
  consensusIdenticalAggregation,
  Runner,
  getNetwork,
  hexToBase64
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";

// ==========================================
// Configuration & Smart Contract Settings
// ==========================================
// SECURITY: Never hardcode endpoints in production. Replace with your actual secure backend URL.
const ORACLE_API_URL = "YOUR_ORACLE_API_ENDPOINT_HERE";

// Replace with your deployed DeRAGReceiver.sol contract address on the target network
const RECEIVER_CONTRACT_ADDRESS = "0xYOUR_SMART_CONTRACT_ADDRESS_HERE";

// The query payload that will be processed by the off-chain FastAPI/Gemini RAG pipeline
const ENTERPRISE_QUERY = "What is the financial and human capital risk?";

// ==========================================
// Main Workflow Execution
// ==========================================
const onCronTrigger = async (runtime: Runtime) => {
  runtime.log(`🚀 Triggering DeRAG-Oracle Workflow execution...`);
  
  // -----------------------------------------------------------
  // 1. Off-Chain Retrieval & AI Synthesis (Node Mode)
  // -----------------------------------------------------------
  // Each node independently requests data from the AI middleware. 
  // We use consensusIdenticalAggregation to ensure a supermajority agrees on the exact output.
  const aiResponse = await runtime.runInNodeMode(
    async (nodeRuntime: NodeRuntime) => {
      const httpClient = new HTTPClient();
      
      // Make the POST request to the off-chain FastAPI service.
      // NOTE: CRE SDK requires the body to be base64-encoded.
      const requestPayload = Buffer.from(JSON.stringify({ query: ENTERPRISE_QUERY })).toString("base64");
      
      const response = httpClient.sendRequest({
        url: ORACLE_API_URL,
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" // Safe to leave, prevents HTML landing pages if tunneling
        },
        body: requestPayload
      }).result();
      
      if (response.statusCode !== 200) {
        throw new Error(`HTTP Error from Oracle Backend: ${response.statusCode}`);
      }
      
      const responseText = new TextDecoder().decode(response.body);
      
      try {
        const data = JSON.parse(responseText);
        // Strictly extract the desired text response to prevent formatting conflicts
        return data.response ? String(data.response) : responseText;
      } catch (e) {
        throw new Error(`Failed to parse JSON response from AI Backend. Raw response: ${responseText}`);
      }
    }, 
    consensusIdenticalAggregation()
  )();

  // -----------------------------------------------------------
  // 2. Payload Validation & Sanitization
  // -----------------------------------------------------------
  // Force the consensus payload into a pure string.
  // This prevents "[object Object]" serialization errors during ABI encoding.
  const finalPayload = typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse);
  
  // Log the sanitized data (truncated) to the runtime terminal before it hits the blockchain
  runtime.log(`🔍 Sanitized Payload Content: ${finalPayload.substring(0, 80)}...`);

  // -----------------------------------------------------------
  // 3. ABI-Encoding the EVM Payload
  // -----------------------------------------------------------
  // Dynamically encode the text payload so the receiver smart contract can natively parse it.
  const encodedData = encodeAbiParameters(
    parseAbiParameters("string"), 
    [finalPayload]
  );
  
  // -----------------------------------------------------------
  // 4. Generate the Cryptographic Consensus Report
  // -----------------------------------------------------------
  const signedReport = runtime.report({
    encodedPayload: hexToBase64(encodedData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  }).result();
  
  // -----------------------------------------------------------
  // 5. Submit Transaction to the Target Blockchain
  // -----------------------------------------------------------
  // Fetch metadata specific to the BNB Smart Chain Testnet
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: "binance_smart_chain-testnet",
    isTestnet: true
  });
  
  if (!network) throw new Error("Failed to load BNB Smart Chain testnet from SDK");

  // Extract the specific numeric chain selector ID mapped by the CRE SDK
  const evmClient = new EVMClient(network.chainSelector.selector);
  
  // Transmit the signed report to the destination smart contract
  const tx = evmClient.writeReport(runtime, {
    receiver: RECEIVER_CONTRACT_ADDRESS,
    report: signedReport,
    gasConfig: { gasLimit: "500000" } 
  }).result();

  runtime.log(`🎯 SUCCESS: AI data successfully pushed on-chain! Tx Hash: ${tx.txHash}`);

  return "Success";
};

// ==========================================
// Workflow Initialization
// ==========================================
export const initWorkflow = () => {
  const cron = new CronCapability();
  // Triggers exactly on the minute, every minute
  return [handler(cron.trigger({ schedule: "* * * * *" }), onCronTrigger)];
};

export async function main() {
  const runner = await Runner.newRunner();
  await runner.run(initWorkflow);
}