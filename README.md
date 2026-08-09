
# DeRAG-Oracle: A Decentralized Retrieval-Augmented Generation Architecture for On-Chain Risk Telemetry

**Author:** Akanksha Sharma  
**Affiliation:** B.S. Artificial Intelligence and Data Science, Indian Institute of Technology (IIT) Jodhpur  

---

## Abstract

Smart contracts executing on the Ethereum Virtual Machine (EVM) are strictly limited in their ability to process unstructured enterprise data due to prohibitive on-chain storage costs and the lack of native text-parsing capabilities. Conventional oracle networks resolve off-chain connectivity primarily for deterministic, highly structured numerical data feeds. 

**DeRAG-Oracle** introduces a hybrid decentralized architecture that bridges unstructured enterprise documentation with Web3 smart contracts. The system combines BNB Greenfield object storage for data persistence, an off-chain FastAPI Retrieval-Augmented Generation (RAG) middleware powered by Google Gemini Flash, and Chainlink's Custom Runtime Environment (CRE) for decentralized node consensus. Raw enterprise files are distilled into ultra-compact, schema-constrained risk metrics before on-chain state settlement. Over a systematic $N=30$ benchmark, the architecture demonstrated an execution success rate of 100.0% (0.0% execution failure rate), a mean latency of 6.882 seconds, and an average payload size of 369.43 bytes, representing a semantic data reduction of approximately 99.26%.

---

## System Architecture and Pipeline

The DeRAG-Oracle framework operates across four modular layers to shift heavy text analysis off-chain while maintaining cryptographic integrity and execution determinism.

```text
+------------------------+      +-------------------------------+      +---------------------------------+      +------------------------+
|  BNB Greenfield Storage| ---> | FastAPI RAG Middleware        | ---> | Chainlink CRE Consensus Network | ---> | EVM Smart Contract     |
|  (Raw Enterprise JSON) |      | (Gemini Flash, Temp = 0.0)    |      | (Mode-based Aggregation)        |      | (DeRAGReceiver.sol)    |
+------------------------+      +-------------------------------+      +---------------------------------+      +------------------------+

Setup and Installation
Prerequisites
Python: 3.10+

Node.js: 18.0+ / Bun Runtime

Google Gemini API Key: Required for Gemini model access

Chainlink CRE CLI: Installed for oracle workflow deployment

1. Backend Service Configuration
Clone the repository and install the Python dependencies:

Bash
git clone [https://github.com/your-username/DeRAG-Oracle.git](https://github.com/your-username/DeRAG-Oracle.git)
cd DeRAG-Oracle/ai_backend

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
Set environment variables in your local environment or .env file:

Bash
export GEMINI_API_KEY="your_gemini_api_key_here"
export GREENFIELD_URL="[https://gnfd-testnet-sp3.bnbchain.org/view/your-bucket/your-file.json](https://gnfd-testnet-sp3.bnbchain.org/view/your-bucket/your-file.json)"
Start the FastAPI application server:

Bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
2. Running Benchmarks
To run latency and stability evaluations against the middleware endpoint:

Bash
python benchmark.py
3. Chainlink CRE Workflow Deployment
Navigate to the workflow workspace and install Node dependencies:

Bash
cd ../derag-workflow/workflow
npm install
Copy the secrets configuration template and add your network RPC keys:

Bash
cp secrets.example.yaml secrets.yaml
Simulate the workflow locally using the Chainlink CRE runner:

Bash
cre workflow run
Citation
If you reference this architecture, benchmark methodology, or repository in academic or industry research, please cite it as follows:

Code snippet
@misc{sharma2026derag,
  author       = {Sharma, Akanksha},
  title        = {{DeRAG-Oracle: A Decentralized Retrieval-Augmented Generation Architecture for On-Chain Risk Telemetry}},
  institution  = {Indian Institute of Technology (IIT) Jodhpur},
  year         = {2026},
  note         = {Software Repository and Technical Report}
}