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
const ORACLE_API_URL = "YOUR_ORACLE_API_ENDPOINT_HERE";

const RECEIVER_CONTRACT_ADDRESS = "0xYOUR_SMART_CONTRACT_ADDRESS_HERE";

const ENTERPRISE_QUERY = "What is the financial and human capital risk?";

// ==========================================
// Main Workflow Execution
// ==========================================
const onCronTrigger = async (runtime: Runtime) => {
  runtime.log(`🚀 Triggering DeRAG-Oracle Workflow execution...`);
  
  // -----------------------------------------------------------
  // 1. Off-Chain Retrieval & AI Synthesis (Node Mode)
  // -----------------------------------------------------------
  const aiResponse = await runtime.runInNodeMode(
    async (nodeRuntime: NodeRuntime) => {
      const httpClient = new HTTPClient();
      
    
      const requestPayload = Buffer.from(JSON.stringify({ query: ENTERPRISE_QUERY })).toString("base64");
      
      const response = httpClient.sendRequest({
        url: ORACLE_API_URL,
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" 
        },
        body: requestPayload
      }).result();
      
      if (response.statusCode !== 200) {
        throw new Error(`HTTP Error from Oracle Backend: ${response.statusCode}`);
      }
      
      const responseText = new TextDecoder().decode(response.body);
      
      try {
        const data = JSON.parse(responseText);
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

  const finalPayload = typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse);
  
  runtime.log(`🔍 Sanitized Payload Content: ${finalPayload.substring(0, 80)}...`);

  // -----------------------------------------------------------
  // 3. ABI-Encoding the EVM Payload
  // -----------------------------------------------------------
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
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: "binance_smart_chain-testnet",
    isTestnet: true
  });
  
  if (!network) throw new Error("Failed to load BNB Smart Chain testnet from SDK");

  const evmClient = new EVMClient(network.chainSelector.selector);

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
 
  return [handler(cron.trigger({ schedule: "* * * * *" }), onCronTrigger)];
};

export async function main() {
  const runner = await Runner.newRunner();
  await runner.run(initWorkflow);
}
