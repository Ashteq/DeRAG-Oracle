import { Workflow, Fetch, Write } from "@chainlink/cre-sdk";

// 1. Fetch data from your Python ngrok server
const fetchStep = new Fetch({
  url: "url: "https://eternal-headless-drizzle.ngrok-free.dev/api/v1/oracle/query"",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "risk" })
});

// 2. Write the AI response to your deployed Remix contract
const writeStep = new Write({
  contractAddress: "0xfd434af57F50756e8148a41cEe8a6590D5A91dD1",
  abi: ["function updateAiResponse(string calldata _response)"],
  functionName: "updateAiResponse",
  args: [fetchStep.outputs.response] 
});

// 3. Define the workflow
export const aiWorkflow = new Workflow({
  name: "DeRAG-Query",
  steps: [fetchStep, writeStep]
});