
import sys
import os
import argparse
from app.tiktok_pipeline import task_run_tiktok_pipeline

# Add project root to path
sys.path.append(os.getcwd())

def main():
    parser = argparse.ArgumentParser(description="Run TikTok Scraper")
    parser.add_argument("--dry-run", action="store_true", help="Run in dry run mode (no tasks queued, just logs)")
    args = parser.parse_args()
    
    print(f"Starting TikTok Scraper (Dry Run: {args.dry_run})...")
    task_run_tiktok_pipeline(dry_run=args.dry_run)

if __name__ == "__main__":
    main()
