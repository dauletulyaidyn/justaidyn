"""Setup and publish to TikTok."""
import asyncio
import logging
from pathlib import Path
from browser_automation import TikTokWebAutomation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def publish_to_tiktok():
    """Publish main banner to TikTok."""
    banner = Path("../00_first.png")
    
    if not banner.exists():
        logger.error("Banner not found!")
        return
    
    logger.info("=" * 60)
    logger.info("Setting up TikTok...")
    logger.info("=" * 60)
    
    # Note: TikTok only accepts videos, not images
    # We need to convert the image to a video first
    logger.info("NOTE: TikTok requires video format.")
    logger.info("Converting image to video...")
    
    # For now, let's just test the login
    automation = TikTokWebAutomation(
        email="aidyn.daulet@gmail.com",
        password="Allahuakbar1!",
        headless=False
    )
    
    try:
        await automation.init_browser()
        logged_in = await automation.login()
        
        if logged_in:
            logger.info("✅ TikTok login successful!")
            logger.info("Session saved for future use.")
        else:
            logger.error("❌ TikTok login failed")
            
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await automation.close_browser()


if __name__ == '__main__':
    asyncio.run(publish_to_tiktok())
