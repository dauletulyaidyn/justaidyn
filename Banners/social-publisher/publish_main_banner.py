"""Publish main banner to all configured social media platforms."""
import asyncio
import logging
from pathlib import Path
from publisher import SocialMediaPublisher

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def publish_main_banner():
    """Publish the main banner (00_first.png) to all platforms."""
    
    publisher = SocialMediaPublisher()
    
    # Main banner file
    main_banner = Path("../00_first.png")
    
    if not main_banner.exists():
        logger.error("Main banner not found: 00_first.png")
        return
    
    logger.info("=" * 60)
    logger.info("🚀 PUBLISHING MAIN BANNER TO ALL PLATFORMS")
    logger.info("=" * 60)
    logger.info(f"File: {main_banner.name}")
    logger.info(f"Platforms configured: {len(publisher.publishers)}")
    logger.info(f"Browser automations: {len(publisher.browser_automations)}")
    
    # Command to publish everywhere
    command = "Опубликуй 00_first.png везде"
    
    result = await publisher.process_command(command)
    
    logger.info("\n" + "=" * 60)
    logger.info("📊 PUBLISHING RESULTS")
    logger.info("=" * 60)
    
    successful_count = sum(1 for r in result['results'].values() if r['success'])
    total_count = len(result['results'])
    failed_count = total_count - successful_count
    
    logger.info(f"Results: {successful_count}/{total_count} successful")
    
    for platform, res in result['results'].items():
        status = "✅" if res['success'] else "❌"
        method = "(browser)" if res.get('used_browser') else "(API)"
        error = f" - {res.get('error', '')}" if not res['success'] else ""
        logger.info(f"  {status} {platform} {method}{error}")
    
    logger.info("=" * 60)


if __name__ == '__main__':
    asyncio.run(publish_main_banner())
