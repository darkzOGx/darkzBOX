import asyncio
from app.discovery import DiscoveryEngine
    
async def test_engine_integration():
    engine = DiscoveryEngine()
    seed = "diningwithdamian"
    
    print(f"Running DiscoveryEngine for seed: @{seed}")
    users = await engine.discover_network_peers(seed)
    
    print("-" * 50)
    print(f"Total Unique Users Found: {len(users)}")
    print("First 10 Users:")
    for u in users[:10]:
        print(f" - {u}")

if __name__ == "__main__":
    asyncio.run(test_engine_integration())
