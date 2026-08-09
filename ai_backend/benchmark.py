import httpx
import asyncio
import time
import json
import statistics
import os

# ==========================================
# Configuration & Environment Variables
# ==========================================
# Replace with your actual deployed FastAPI endpoint
API_URL = "YOUR_API_ENDPOINT_HERE" 

# Define how many requests to run per execution
BATCH_SIZE = 1   

# Define how many requests can run concurrently
CONCURRENCY = 1

# Output file for historical benchmark data
DATA_FILE = "benchmark_results.json"

async def fetch(client: httpx.AsyncClient, query_id: int) -> dict:
    """
    Executes a single POST request to the oracle endpoint.
    Records the latency, payload size, and success status.
    """
    payload = {"query": "What is the financial and human capital risk?"}
    start_time = time.time()
    
    try:
        # 20-second timeout to accommodate LLM inference time
        response = await client.post(API_URL, json=payload, timeout=20.0)
        response.raise_for_status()
        
        latency = time.time() - start_time
        payload_size = len(response.text)
        
        return {
            "id": query_id, 
            "status": "success", 
            "latency": latency, 
            "size": payload_size
        }
    except Exception as e:
        # Catch timeouts, connection errors, and HTTP 4xx/5xx errors
        return {
            "id": query_id, 
            "status": "error", 
            "latency": time.time() - start_time, 
            "error": str(e)
        }

async def run_benchmark():
    """
    Main execution loop for the benchmark.
    Loads historical data, runs a new batch of requests with rate limiting,
    calculates aggregate statistics, and updates the JSON output file.
    """
    all_results = []
    
    # 1. Load existing results if the file already exists
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                saved_data = json.load(f)
                all_results = saved_data.get("raw_results", [])
                print(f"📂 Loaded {len(all_results)} existing data points from {DATA_FILE}")
        except Exception:
            print(f"⚠️ Could not read {DATA_FILE}. Starting fresh.")
            all_results = []

    # Determine the starting ID to maintain a continuous sequence
    start_id = len(all_results) + 1
    print(f"🚀 Running batch of {BATCH_SIZE} requests (Starting at ID #{start_id})...")

    # 2. Execute requests asynchronously with rate limiting
    async with httpx.AsyncClient() as client:
        sem = asyncio.Semaphore(CONCURRENCY)
        
        async def sem_fetch(query_id):
            async with sem:
                # Deliberate 6.5s delay to prevent 429 Too Many Requests from the LLM provider
                await asyncio.sleep(6.5)
                return await fetch(client, query_id)
        
        # Create a list of tasks for the current batch
        tasks = [sem_fetch(start_id + i) for i in range(BATCH_SIZE)]
        new_results = await asyncio.gather(*tasks)

    # 3. Combine historical and new results
    all_results.extend(new_results)

    # 4. Calculate global metrics across ALL accumulated data
    successes = [r for r in all_results if r["status"] == "success"]
    errors = [r for r in all_results if r["status"] == "error"]

    if not successes:
        print("❌ All requests failed. Ensure your FastAPI server is running and the API_URL is correct.")
        return

    latencies = [r["latency"] for r in successes]
    sizes = [r["size"] for r in successes]

    mean_latency = statistics.mean(latencies)
    
    # Calculate P95 latency (requires at least 2 data points for quantiles)
    if len(latencies) >= 2:
        p95_latency = statistics.quantiles(latencies, n=100)[94]
    else:
        p95_latency = max(latencies)
        
    error_rate = (len(errors) / len(all_results)) * 100
    avg_size = statistics.mean(sizes)

    # 5. Generate and print the summary report
    summary = {
        "Accumulated Requests": len(all_results),
        "Successful Data Points": len(successes),
        "Success Rate (%)": round(100 - error_rate, 2),
        "Error Rate (%)": round(error_rate, 2),
        "Mean Latency (seconds)": round(mean_latency, 3),
        "P95 Latency (seconds)": round(p95_latency, 3),
        "Average Payload Size (bytes)": round(avg_size, 2)
    }

    print("\n📊 Global Benchmark Summary across all batches:")
    print(json.dumps(summary, indent=4))

    # 6. Save the updated dataset back to disk
    with open(DATA_FILE, "w") as f:
        json.dump({"summary": summary, "raw_results": all_results}, f, indent=4)
        
    print(f"\n💾 Saved total dataset ({len(all_results)} items) to {DATA_FILE}")

if __name__ == "__main__":
    asyncio.run(run_benchmark())