// Arguments injected into the script from your on-chain request
const apiUrl = args[0];

if (!apiUrl) {
  throw Error("No API URL provided in args[0]");
}

console.log(`Sending HTTP GET request to: ${apiUrl}`);

// Make the HTTP request to the Python backend
const apiResponse = await Functions.makeHttpRequest({
  url: apiUrl,
  method: "GET",
  // CRITICAL FIX: Ngrok free tier blocks programmatic requests with an HTML warning.
  // This header bypasses the warning and ensures Chainlink receives your JSON data.
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

// Handle errors from the HTTP request
if (apiResponse.error) {
  console.error("HTTP Request Error:", apiResponse.error);
  throw Error(`Request failed. Status code: ${apiResponse.status || "Unknown"}`);
}

// Extract the JSON data from the response
const { data } = apiResponse;
console.log("Received data:", data);

// Ensure "data.response" matches the exact JSON key returned by your FastAPI backend.
// If your Python returns {"answer": "..."}, change this to data.answer.
const ragOutput = data.response; 

if (!ragOutput) {
  throw Error("The expected 'response' key was not found in the JSON payload.");
}

// Convert the JavaScript string into the bytes format required on-chain
return Functions.encodeString(ragOutput);