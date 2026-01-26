import re
import asyncio
import random
from typing import Optional, Dict
from playwright.async_api import async_playwright, Page
from loguru import logger
from app.config import settings

class EnrichmentEngine:
    """
    Phase 3: Enrichment
    Uses a 3-Tier Waterfall Strategy to extract emails:
    1. Tier 1: Regex Scan of Biography (Instant)
    2. Tier 2: Linktree/Bio-Link Drill-down (Fast)
    3. Tier 3: Mobile Emulator Fallback (Slow/Expensive)
    """
    
    USER_AGENTS = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"
    ]
    
    # Tier 2 Targets
    BIO_LINK_DOMAINS = ["linktr.ee", "beacons.ai", "carrd.co", "taplink.cc"]

    async def enrich_user(self, user_data: Dict) -> Optional[str]:
        """
        Main entry point.
        user_data must contain: 'username', 'biography', 'external_url'
        """
        username = user_data.get('username')
        bio = user_data.get('biography') or ""
        external_url = user_data.get('external_url')

        logger.info(f"🔍 Enriching {username}...")

        # --- Tier 1: Bio Regex ---
        email = self._tier1_regex(bio)
        if email:
            logger.success(f"✅ Tier 1 (Regex) Success: {email}")
            return email

        # --- Tier 2: Bio Link ---
        if external_url and any(d in external_url for d in self.BIO_LINK_DOMAINS):
            email = await self._tier2_bio_link(external_url)
            if email:
                logger.success(f"✅ Tier 2 (Linktree) Success: {email}")
                return email

        # --- Tier 3: Mobile Emulation ---
        # Only if we really need it.
        email = await self._tier3_mobile_emulation(username)
        if email:
            logger.success(f"✅ Tier 3 (Mobile) Success: {email}")
            return email

        logger.warning(f"❌ All Tiers Failed for {username}")
        return None

    def _tier1_regex(self, text: str) -> Optional[str]:
        """Scan text for email patterns."""
        if not text:
            return None
        # Basic email regex
        match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        if match:
            return match.group(0)
        # Obfuscated: "foo [at] gmail"
        match_obfuscated = re.search(r'([\w\.-]+)\s*\[at\]\s*([\w\.-]+\.\w+)', text, re.IGNORECASE)
        if match_obfuscated:
            return f"{match_obfuscated.group(1)}@{match_obfuscated.group(2)}"
        return None

    async def _tier2_bio_link(self, url: str) -> Optional[str]:
        """Visit the bio link and search for mailto or text."""
        # We start a lightweight browser context just for this page
        email = None
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, timeout=15000) # Fast timeout
                content = await page.content()
                
                # Check 1: Mailto in HTML
                mailto = await page.evaluate(r"""() => {
                    const link = document.querySelector('a[href^="mailto:"]');
                    return link ? link.href : null;
                }""")
                if mailto:
                     return mailto.replace("mailto:", "").split("?")[0]

                # Check 2: Regex on the visible text
                text_content = await page.inner_text("body")
                return self._tier1_regex(text_content)
                
            except Exception as e:
                logger.warning(f"Tier 2 failed on {url}: {e}")
            finally:
                await browser.close()
        return None

    async def _tier3_mobile_emulation(self, username: str) -> Optional[str]:
        """Original Playwright Mobile Strategy"""
        email = None
        async with async_playwright() as p:
            iphone = p.devices['iPhone 12 Pro']
            # Fix: Update dictionary directly to avoid duplicate kwarg error
            iphone['user_agent'] = random.choice(self.USER_AGENTS)
            
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(**iphone)
            page = await context.new_page()
            
            try:
                await page.goto(f"https://www.instagram.com/{username}/", timeout=settings.ENRICHMENT_TIMEOUT * 1000)
                await asyncio.sleep(random.uniform(3, 5)) # Wait for hydration

                # Strategy: Click 'Contact' or 'Email'
                # Check for buttons
                btns = page.locator("button, a, div[role='button']")
                
                contact_btn = page.get_by_text("Contact", exact=True)
                email_btn = page.get_by_text("Email", exact=True)
                
                # Try Email Button Directly
                if await email_btn.count() > 0 and await email_btn.is_visible():
                    logger.info("Found 'Email' button, clicking...")
                    await email_btn.first.click()
                elif await contact_btn.count() > 0 and await contact_btn.is_visible():
                     logger.info("Found 'Contact' button, clicking...")
                     await contact_btn.first.click()
                
                await asyncio.sleep(2)

                # Scan for mailto in DOM (often triggered by sheet)
                mailto = await page.evaluate(r"""() => {
                    const links = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
                    return links.length > 0 ? links[0].href : null;
                }""")
                
                if mailto:
                    email = mailto.replace("mailto:", "").split("?")[0]
                else:
                    # Final fallback: Look for email text in the potential pop-up/sheet
                    content = await page.inner_text("body")
                    email = self._tier1_regex(content)

            except Exception as e:
                logger.error(f"Tier 3 Error @{username}: {e}")
            finally:
                await browser.close()
                
        return email

if __name__ == "__main__":
    # Test Run
    async def test():
        engine = EnrichmentEngine()
        # Mock Data
        print(await engine.enrich_user({
            "username": "socal_foodie", 
            "biography": "Love food! contact: tasty@food.com",
            "external_url": None
        }))
    asyncio.run(test())
