"""Setup WhatsApp Web - scan QR code."""
import asyncio
import logging
from browser_automation import WhatsAppWebAutomation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def setup_whatsapp():
    """Setup WhatsApp Web with QR code."""
    logger.info("=" * 60)
    logger.info("WhatsApp Web Setup")
    logger.info("=" * 60)
    logger.info("")
    logger.info("A browser will open with WhatsApp Web.")
    logger.info("Please scan the QR code with your phone:")
    logger.info("WhatsApp > Settings > Linked Devices > Link a Device")
    logger.info("")
    logger.info("Waiting 60 seconds for scan...")
    logger.info("")
    
    automation = WhatsAppWebAutomation(headless=False)
    
    try:
        await automation.init_browser()
        logged_in = await automation.login()
        
        if logged_in:
            logger.info("")
            logger.info("=" * 60)
            logger.info("SUCCESS! WhatsApp is now connected.")
            logger.info("Session saved for future use.")
            logger.info("=" * 60)
        else:
            logger.error("Failed to connect WhatsApp")
            
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await automation.close_browser()


if __name__ == '__main__':
    asyncio.run(setup_whatsapp())
