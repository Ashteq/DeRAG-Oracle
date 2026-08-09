import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ==========================================
# Application Initialization
# ==========================================
app = FastAPI(title="DeRAG-Oracle Middleware", version="1.0.0")

class QueryModel(BaseModel):
    query: str

# ==========================================
# Configuration & Environment Variables
# ==========================================
# SECURITY: Never hardcode API keys. Load them from the .env file.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Allow the Greenfield URL to be overridden by the environment, but provide a safe placeholder
GREENFIELD_URL = os.getenv(
    "GREENFIELD_URL", 
    "https://gnfd-testnet-sp3.bnbchain.org/view/derag-ai-storage-1/q3_enterprise_risk.json"
)

@app.on_event("startup")
async def startup_event():
    """Startup check to ensure critical environment variables are loaded."""
    if not GEMINI_API_KEY:
        print("🚨 CRITICAL WARNING: GEMINI_API_KEY is not set in the environment!")

# ==========================================
# Core Functions
# ==========================================
async def fetch_greenfield_context() -> str:
    """
    Retrieves raw enterprise data asynchronously from BNB Greenfield decentralized storage.
    """
    try:
        # 10-second timeout to prevent oracle hanging on storage retrieval
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(GREENFIELD_URL)
            response.raise_for_status()
            return response.text
    except Exception as e:
        print(f"⚠️ Error reading Greenfield: {e}")
        # Return empty JSON string as fallback context
        return "{}"

async def run_gemini_rag(query: str, context: str) -> str:
    """
    Synthesizes the Greenfield context and user query using the Gemini REST API.
    Enforces a strict 0.0 temperature to minimize sampling variability for on-chain consensus.
    """
    if not GEMINI_API_KEY:
        return "Error: API key missing."

    prompt = (
        "You are an Enterprise Risk AI Oracle on the BNB Smart Chain.\n"
        "Analyze the following JSON risk report retrieved from BNB Greenfield and answer the user query concisely.\n"
        "Keep your final response under 60 words so it fits comfortably within smart contract transaction storage limits.\n\n"
        "--- DECENTRALIZED ENTERPRISE JSON CONTEXT (BNB GREENFIELD) ---\n"
        f"{context}\n"
        "------------------------------------------------------------\n\n"
        f"USER QUERY: {query}"
    )

    # Note: Ensure the model version here matches what you tested (Gemini 1.5/3.6 Flash)
    GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_API_KEY}"
    
    # Adding temperature=0.0 to match the whitepaper's architectural claims
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0
        }
    }

    try:
        # 15-second timeout for LLM inference
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(GEMINI_URL, json=payload, headers={"Content-Type": "application/json"})
            response.raise_for_status()
            
            data = response.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                parts = data["candidates"][0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
            
            return "Error: Gemini returned an empty or blocked response."
            
    except Exception as e:
        print(f"⚠️ Gemini API Error: {e}")
        return "Error generating RAG analysis from Gemini."

# ==========================================
# API Endpoints
# ==========================================
@app.post("/api/v1/oracle/query")
async def oracle_endpoint(payload: QueryModel):
    """
    Primary ingestion endpoint for the Chainlink CRE oracle nodes.
    """
    print(f"\n📩 Incoming Oracle Query: '{payload.query}'")
    
    print("🌐 Retrieving document from BNB Greenfield...")
    context = await fetch_greenfield_context()
    
    print("🧠 Sending data to Gemini API...")
    ai_analysis = await run_gemini_rag(payload.query, context)
    
    print(f"✅ Generated RAG Output: {ai_analysis}\n")
    
    return {"response": ai_analysis}