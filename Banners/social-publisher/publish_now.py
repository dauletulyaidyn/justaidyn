"""Direct publish script for Aidyn's social media."""
import asyncio
import logging
from pathlib import Path
from config import TELEGRAM_CONFIG, BROWSER_CONFIG
from publishers import TelegramPublisher
from browser_automation import (
    WhatsAppWebAutomation,
    InstagramWebAutomation,
    FacebookWebAutomation,
    TelegramWebAutomation,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def publish_to_telegram(file_path: Path):
    """Publish to Telegram channel via API."""
    logger.info("📱 Publishing to Telegram Channel...")
    
    publisher = TelegramPublisher(TELEGRAM_CONFIG)
    
    try:
        success = await publisher.publish_content(file_path)
        if success:
            logger.info("✅ Telegram: Published successfully")
        else:
            logger.error("❌ Telegram: Failed")
        return success
    except Exception as e:
        logger.error(f"❌ Telegram error: {e}")
        return False


async def publish_to_whatsapp_status(file_path: Path):
    """Publish to WhatsApp Status via browser."""
    logger.info("📱 Publishing to WhatsApp Status...")
    
    automation = WhatsAppWebAutomation(headless=False)
    
    try:
        await automation.init_browser()
        success = await automation.publish_status(file_path)
        await automation.close_browser()
        
        if success:
            logger.info("✅ WhatsApp Status: Published successfully")
        else:
            logger.error("❌ WhatsApp Status: Failed")
        return success
    except Exception as e:
        logger.error(f"❌ WhatsApp Status error: {e}")
        try:
            await automation.close_browser()
        except:
            pass
        return False


async def publish_to_instagram(file_path: Path, caption: str = ""):
    """Publish to Instagram via browser."""
    logger.info("📱 Publishing to Instagram...")
    
    from config import INSTAGRAM_WEB_CONFIG
    
    if not INSTAGRAM_WEB_CONFIG.get('username'):
        logger.error("❌ Instagram: No credentials configured")
        return False
    
    automation = InstagramWebAutomation(
        username=INSTAGRAM_WEB_CONFIG['username'],
        password=INSTAGRAM_WEB_CONFIG['password'],
        headless=False
    )
    
    try:
        await automation.init_browser()
        success = await automation.publish_content(file_path, caption)
        await automation.close_browser()
        
        if success:
            logger.info("✅ Instagram: Published successfully")
        else:
            logger.error("❌ Instagram: Failed")
        return success
    except Exception as e:
        logger.error(f"❌ Instagram error: {e}")
        try:
            await automation.close_browser()
        except:
            pass
        return False


async def publish_to_facebook(file_path: Path, caption: str = ""):
    """Publish to Facebook via browser."""
    logger.info("📱 Publishing to Facebook...")
    
    from config import FACEBOOK_WEB_CONFIG
    
    if not FACEBOOK_WEB_CONFIG.get('email'):
        logger.error("❌ Facebook: No credentials configured")
        return False
    
    automation = FacebookWebAutomation(
        email=FACEBOOK_WEB_CONFIG['email'],
        password=FACEBOOK_WEB_CONFIG['password'],
        headless=False
    )
    
    try:
        await automation.init_browser()
        success = await automation.publish_content(file_path, caption)
        await automation.close_browser()
        
        if success:
            logger.info("✅ Facebook: Published successfully")
        else:
            logger.error("❌ Facebook: Failed")
        return success
    except Exception as e:
        logger.error(f"❌ Facebook error: {e}")
        try:
            await automation.close_browser()
        except:
            pass
        return False


async def main():
    """Main publish function."""
    
    # Main banner
    banner_file = Path("../00_first.png")
    
    if not banner_file.exists():
        logger.error(f"Banner not found: {banner_file}")
        return
    
    logger.info("=" * 60)
    logger.info("🚀 PUBLISHING MAIN BANNER")
    logger.info("=" * 60)
    logger.info(f"File: {banner_file}")
    logger.info("")
    
    results = {}
    
    # 1. Telegram (API - самый простой)
    results['telegram'] = await publish_to_telegram(banner_file)
    
    # 2. Facebook (Browser)
    results['facebook'] = await publish_to_facebook(banner_file, "Main banner")
    
    # 3. Instagram (Browser)
    results['instagram'] = await publish_to_instagram(banner_file, "Main banner")
    
    # 4. WhatsApp Status (Browser)
    results['whatsapp_status'] = await publish_to_whatsapp_status(banner_file)
    
    # Summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("📊 RESULTS SUMMARY")
    logger.info("=" * 60)
    
    success_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    for platform, success in results.items():
        status = "✅" if success else "❌"
        logger.info(f"  {status} {platform}")
    
    logger.info("")
    logger.info(f"Total: {success_count}/{total_count} successful")
    logger.info("=" * 60)


if __name__ == '__main__':
    asyncio.run(main())
