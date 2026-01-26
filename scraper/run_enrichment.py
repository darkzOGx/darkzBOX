import asyncio
import csv
import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from loguru import logger
from app.models import Influencer
from app.config import settings
from app.enrichment import EnrichmentEngine
from datetime import datetime

# Database Setup
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)

async def enrich_from_db():
    """Fallback: Standard DB Batch Processing"""
    session = Session()
    enricher = EnrichmentEngine()
    
    candidates = session.query(Influencer).filter(
        Influencer.email == None,
        Influencer.email_enriched == False
    ).order_by(Influencer.score.desc()).limit(50).all()
    
    if not candidates:
        logger.warning("No candidates found in DB needing enrichment.")
        session.close()
        return

    logger.info(f"Starting DB Batch Enrichment for {len(candidates)} candidates...")
    await process_batch(candidates, enricher, session)
    session.close()

async def enrich_from_csv(file_path: str):
    """Enrich directly from a CSV file export"""
    # Clean path (remove quotes from drag-drop)
    file_path = file_path.strip().strip('"').strip("'")
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return

    logger.info(f"📂 Reading: {file_path}")
    
    # Output filename
    base, ext = os.path.splitext(file_path)
    out_file = f"{base}_enriched{ext}"
    
    session = Session()
    enricher = EnrichmentEngine()
    
    rows = []
    enriched_count = 0
    
    try:
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            
            # Ensure we have required columns
            if not all(k in fieldnames for k in ['username']):
                logger.error("CSV must have at least a 'username' column.")
                return
                
            for row in reader:
                rows.append(row)

        logger.info(f"Found {len(rows)} rows. Processing entries with missing emails...")

        for i, row in enumerate(rows):
            username = row.get('username')
            email = row.get('email')
            
            # Skip if already has email
            if email and "@" in email:
                continue
                
            logger.info(f"[{i+1}/{len(rows)}] Checking @{username}...")
            
            # Prepare data for enricher
            user_data = {
                "username": username,
                "biography": row.get('biography', ''),
                "external_url": row.get('external_url', '')
            }
            
            # 1. Try to Enrich
            new_email = await enricher.enrich_user(user_data)
            
            if new_email:
                # Update Row
                row['email'] = new_email
                enriched_count += 1
                logger.success(f"🎉 FOUND: {new_email}")
                
                # Update DB in background if possible
                db_user = session.query(Influencer).filter_by(username=username).first()
                if db_user:
                    db_user.email = new_email
                    db_user.email_enriched = True
                    db_user.enriched_at = datetime.utcnow()
                    session.commit()
            else:
                # Mark as attempted in DB to avoid loop
                db_user = session.query(Influencer).filter_by(username=username).first()
                if db_user:
                    db_user.email_enriched = True
                    session.commit()
            
            # Save progress every 5 rows
            if i % 5 == 0:
                 write_csv(out_file, fieldnames, rows)
            
            # Rate limit
            await asyncio.sleep(1)

        # Final Save
        write_csv(out_file, fieldnames, rows)
        logger.success(f"Done! Enriched file saved to: {out_file}")
        logger.info(f"Total New Emails: {enriched_count}")

    except Exception as e:
        logger.error(f"CSV Error: {e}")
    finally:
        session.close()

def write_csv(filename, fieldnames, rows):
    with open(filename, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

async def process_batch(candidates, enricher, session):
    """Helper for DB batch processing"""
    total_found = 0
    for user in candidates:
        try:
            user_data = {
                "username": user.username,
                "biography": user.biography,
                "external_url": user.external_url
            }
            email = await enricher.enrich_user(user_data)
            if email:
                user.email = email
                total_found += 1
                logger.success(f"📧 SAVED: {user.username} -> {email}")
            
            user.email_enriched = True
            user.enriched_at = datetime.utcnow()
            session.commit()
            await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Failed {user.username}: {e}")
            session.rollback()

async def main():
    print("\n" + "="*50)
    print("🚀 INSTAGRAM ENRICHMENT RUNNER")
    print("="*50)
    print("1. Drag & Drop a .csv file to enrich specific leads")
    print("2. Press [ENTER] to process pending leads from Database")
    
    choice = input("\nFile path > ")
    
    if choice.strip():
        await enrich_from_csv(choice)
    else:
        await enrich_from_db()

if __name__ == "__main__":
    asyncio.run(main())
