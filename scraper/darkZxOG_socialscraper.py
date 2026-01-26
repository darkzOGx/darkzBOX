#!/usr/bin/env python3
"""
darkZxOG_socialscraper - Unified Social Media Lead Discovery Platform
=====================================================================
Combines TikTok Dorking, Instagram Dorking, Email Enrichment, and Export flows.
"""

import asyncio
import os
import sys
from datetime import datetime
from loguru import logger

# ASCII Art Banner
BANNER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║     ██████╗  █████╗ ██████╗ ██╗  ██╗███████╗██╗  ██╗ ██████╗  ██████╗    ║
║     ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝╚══███╔╝╚██╗██╔╝██╔═══██╗██╔════╝    ║
║     ██║  ██║███████║██████╔╝█████╔╝   ███╔╝  ╚███╔╝ ██║   ██║██║  ███╗   ║
║     ██║  ██║██╔══██║██╔══██╗██╔═██╗  ███╔╝   ██╔██╗ ██║   ██║██║   ██║   ║
║     ██████╔╝██║  ██║██║  ██║██║  ██╗███████╗██╔╝ ██╗╚██████╔╝╚██████╔╝   ║
║     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ║
║                                                                           ║
║                    S O C I A L   S C R A P E R                           ║
║                    ─────────────────────────────                          ║
║                    SoCal Foodie Lead Discovery                            ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def show_menu():
    clear_screen()
    print(BANNER)
    print("\n  ┌─────────────────────────────────────────────────────────────┐")
    print("  │                    SELECT AN OPTION                         │")
    print("  ├─────────────────────────────────────────────────────────────┤")
    print("  │  [1]  🔍 Instagram Dorker  - Find IG leads via Google       │")
    print("  │  [2]  🎵 TikTok Dorker     - Find TikTok leads via Google   │")
    print("  │  [3]  📧 Email Enrichment  - Find emails for existing leads │")
    print("  │  [4]  📊 Export & Enrich   - Export all + enrich emails     │")
    print("  │  [5]  👀 View Results      - Quick stats dashboard          │")
    print("  │  [0]  ❌ Exit                                               │")
    print("  └─────────────────────────────────────────────────────────────┘")
    print()

def run_instagram_dorker():
    """Launch Instagram Dork Discovery"""
    print("\n🔍 Starting Instagram Dork Discovery...")
    print("   This will search Google for Instagram profiles and queue them for classification.\n")
    
    # Import and run
    from run_dork_discovery import main as ig_dork_main
    asyncio.run(ig_dork_main())

def run_tiktok_dorker():
    """Launch TikTok Dork Discovery"""
    print("\n🎵 Starting TikTok Dork Discovery...")
    print("   This will search Google for TikTok profiles and queue them for classification.\n")
    
    # Import and run
    from run_tiktok_dork import main as tt_dork_main
    asyncio.run(tt_dork_main())

def run_email_enrichment():
    """Launch Email Enrichment"""
    print("\n📧 Starting Email Enrichment...")
    print("   You can drag & drop a CSV or press Enter to process from database.\n")
    
    # Import and run
    from run_enrichment import main as enrich_main
    asyncio.run(enrich_main())

def export_and_enrich():
    """Export all leads from both platforms and run enrichment"""
    print("\n📊 Starting Combined Export & Enrichment Flow...")
    
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models import Influencer, TikTokInfluencer
    from app.config import settings
    from app.enrichment import EnrichmentEngine
    import csv
    
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # 1. Export Instagram Leads
    ig_leads = session.query(Influencer).filter(Influencer.email == None).order_by(Influencer.score.desc()).all()
    print(f"\n   📸 Instagram: {len(ig_leads)} leads without email")
    
    # 2. Export TikTok Leads
    tt_leads = session.query(TikTokInfluencer).filter(TikTokInfluencer.email == None).order_by(TikTokInfluencer.score.desc()).all()
    print(f"   🎵 TikTok:    {len(tt_leads)} leads without email")
    
    total = len(ig_leads) + len(tt_leads)
    if total == 0:
        print("\n   ✅ All leads already have emails or no leads found!")
        session.close()
        return
    
    print(f"\n   📧 Starting enrichment for {total} total leads...")
    
    # 3. Run Enrichment
    enricher = EnrichmentEngine()
    
    async def enrich_all():
        enriched_count = 0
        
        # Instagram
        for i, lead in enumerate(ig_leads):
            user_data = {
                "username": lead.username,
                "biography": lead.biography,
                "external_url": lead.external_url
            }
            email = await enricher.enrich_user(user_data)
            if email:
                lead.email = email
                lead.email_enriched = True
                enriched_count += 1
                logger.success(f"[IG] @{lead.username} -> {email}")
            
            if (i + 1) % 10 == 0:
                session.commit()
                print(f"   Progress: {i+1}/{len(ig_leads)} Instagram leads processed...")
            
            await asyncio.sleep(1)  # Rate limit
        
        # TikTok
        for i, lead in enumerate(tt_leads):
            user_data = {
                "username": lead.username,
                "biography": lead.biography,
                "external_url": lead.external_url
            }
            email = await enricher.enrich_user(user_data)
            if email:
                lead.email = email
                enriched_count += 1
                logger.success(f"[TT] @{lead.username} -> {email}")
            
            if (i + 1) % 10 == 0:
                session.commit()
                print(f"   Progress: {i+1}/{len(tt_leads)} TikTok leads processed...")
            
            await asyncio.sleep(1)
        
        session.commit()
        return enriched_count
    
    found = asyncio.run(enrich_all())
    session.close()
    
    print(f"\n   ✅ Enrichment Complete! Found {found} new emails.")
    
    # 4. Export Combined CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"combined_leads_{timestamp}.csv"
    
    session = Session()
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['platform', 'username', 'score', 'email', 'followers', 'bio_snippet'])
        
        for lead in session.query(Influencer).order_by(Influencer.score.desc()).all():
            bio = (lead.biography or "")[:100].replace('\n', ' ')
            writer.writerow(['instagram', lead.username, lead.score, lead.email, lead.follower_count, bio])
        
        for lead in session.query(TikTokInfluencer).order_by(TikTokInfluencer.score.desc()).all():
            bio = (lead.biography or "")[:100].replace('\n', ' ')
            writer.writerow(['tiktok', lead.username, lead.score, lead.email, lead.follower_count, bio])
    
    session.close()
    print(f"   📁 Exported to: {os.path.abspath(filename)}")

def view_results():
    """Show quick stats dashboard"""
    print("\n👀 Results Dashboard\n")
    
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models import Influencer, TikTokInfluencer, BlacklistedAccount, TikTokBlacklistedAccount
    from app.config import settings
    
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    ig_leads = session.query(Influencer).count()
    ig_with_email = session.query(Influencer).filter(Influencer.email != None).count()
    ig_blacklist = session.query(BlacklistedAccount).count()
    
    tt_leads = session.query(TikTokInfluencer).count()
    tt_with_email = session.query(TikTokInfluencer).filter(TikTokInfluencer.email != None).count()
    tt_blacklist = session.query(TikTokBlacklistedAccount).count()
    
    session.close()
    
    print("  ┌────────────────────────────────────────────────────────────┐")
    print("  │                    📊 STATISTICS                          │")
    print("  ├────────────────────────────────────────────────────────────┤")
    print(f"  │  📸 INSTAGRAM                                              │")
    print(f"  │     Qualified Leads:  {ig_leads:<8}                         │")
    print(f"  │     With Email:       {ig_with_email:<8}                         │")
    print(f"  │     Blacklisted:      {ig_blacklist:<8}                         │")
    print("  ├────────────────────────────────────────────────────────────┤")
    print(f"  │  🎵 TIKTOK                                                 │")
    print(f"  │     Qualified Leads:  {tt_leads:<8}                         │")
    print(f"  │     With Email:       {tt_with_email:<8}                         │")
    print(f"  │     Blacklisted:      {tt_blacklist:<8}                         │")
    print("  ├────────────────────────────────────────────────────────────┤")
    print(f"  │  📈 TOTALS                                                 │")
    print(f"  │     Total Leads:      {ig_leads + tt_leads:<8}                         │")
    print(f"  │     Total Emails:     {ig_with_email + tt_with_email:<8}                         │")
    print("  └────────────────────────────────────────────────────────────┘")

def main():
    while True:
        show_menu()
        choice = input("  Enter your choice: ").strip()
        
        if choice == "1":
            run_instagram_dorker()
        elif choice == "2":
            run_tiktok_dorker()
        elif choice == "3":
            run_email_enrichment()
        elif choice == "4":
            export_and_enrich()
        elif choice == "5":
            view_results()
        elif choice == "0":
            print("\n  👋 Goodbye!\n")
            sys.exit(0)
        else:
            print("\n  ⚠️  Invalid option. Please try again.")
        
        input("\n  Press Enter to continue...")

if __name__ == "__main__":
    main()
