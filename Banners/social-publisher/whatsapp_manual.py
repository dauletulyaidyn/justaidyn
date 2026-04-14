"""Manual WhatsApp Web setup - keeps browser open."""
import asyncio
import logging
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def manual_whatsapp_setup():
    """Open WhatsApp Web and wait for manual login."""
    logger.info("=" * 60)
    logger.info("WhatsApp Web Manual Setup")
    logger.info("=" * 60)
    logger.info("")
    logger.info("1. Browser will open with WhatsApp Web")
    logger.info("2. Scan QR code with your phone")
    logger.info("3. Press ENTER in terminal when logged in")
    logger.info("")
    
    playwright = await async_playwright().start()
    
    # Launch browser (NOT headless - so you can see it!)
    browser = await playwright.chromium.launch(
        headless=False,
        args=['--disable-blink-features=AutomationControlled']
    )
    
    context = await browser.new_context(
        viewport={'width': 1280, 'height': 800}
    )
    
    page = await context.new_page()
    
    # Go to WhatsApp Web
    await page.goto("https://web.whatsapp.com")
    
    logger.info("Browser opened! Please scan QR code now.")
    logger.info("Waiting for you to press ENTER after scanning...")
    logger.info("")
    
    # Wait for user to press enter
    input("[Press ENTER after scanning QR code] >>> ")
    
    # Save session
    await context.storage_state(path="browser_data/whatsapp_state.json")
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("SUCCESS! WhatsApp session saved.")
    logger.info("=" * 60)
    
    await browser.close()
    await playwright.stop()


if __name__ == '__main__':
    asyncio.run(manual_whatsapp_setup())
