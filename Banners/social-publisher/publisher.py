"""Main social media publisher script."""
import asyncio
import logging
import sys
from pathlib import Path
from typing import List, Optional

from config import (
    BANNERS_PATH,
    TELEGRAM_CONFIG,
    META_CONFIG,
    YOUTUBE_CONFIG,
    TIKTOK_CONFIG,
    WHATSAPP_CONFIG,
    BROWSER_CONFIG,
    INSTAGRAM_WEB_CONFIG,
    FACEBOOK_WEB_CONFIG,
    TIKTOK_WEB_CONFIG,
    TELEGRAM_WEB_CONFIG,
)
from publishers import (
    TelegramPublisher,
    InstagramPublisher,
    FacebookPublisher,
    YouTubePublisher,
    TikTokPublisher,
    WhatsAppPublisher,
    ThreadsPublisher,
)
from browser_automation import (
    WhatsAppWebAutomation,
    InstagramWebAutomation,
    FacebookWebAutomation,
    TelegramWebAutomation,
    TikTokWebAutomation,
)
from utils import CommandParser

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SocialMediaPublisher:
    """Main publisher orchestrator - supports both API and browser automation."""
    
    def __init__(self):
        self.publishers = {}
        self.browser_automations = {}
        self.parser = CommandParser(BANNERS_PATH)
        self.use_browser = BROWSER_CONFIG.get('use_automation', False)
        self.headless = BROWSER_CONFIG.get('headless', False)
        self._init_publishers()
        self._init_browser_automations()
    
    def _init_publishers(self):
        """Initialize all platform publishers."""
        # Telegram
        if TELEGRAM_CONFIG.get('bot_token'):
            self.publishers['telegram_channel'] = TelegramPublisher(TELEGRAM_CONFIG)
            self.publishers['telegram_status'] = TelegramPublisher(TELEGRAM_CONFIG)
            logger.info("✅ Telegram publisher initialized")
        
        # Instagram (uses Meta config)
        if META_CONFIG.get('access_token') and META_CONFIG.get('instagram_account_id'):
            self.publishers['instagram_content'] = InstagramPublisher(META_CONFIG)
            self.publishers['instagram_status'] = InstagramPublisher(META_CONFIG)
            logger.info("✅ Instagram publisher initialized")
        
        # Facebook
        if META_CONFIG.get('access_token') and META_CONFIG.get('facebook_page_id'):
            self.publishers['facebook_content'] = FacebookPublisher(META_CONFIG)
            self.publishers['facebook_reels'] = FacebookPublisher(META_CONFIG)
            self.publishers['facebook_status'] = FacebookPublisher(META_CONFIG)
            logger.info("✅ Facebook publisher initialized")
        
        # Threads (uses same Meta config)
        if META_CONFIG.get('access_token') and META_CONFIG.get('instagram_account_id'):
            self.publishers['threads'] = ThreadsPublisher(META_CONFIG)
            logger.info("✅ Threads publisher initialized")
        
        # YouTube
        if YOUTUBE_CONFIG.get('refresh_token'):
            self.publishers['youtube'] = YouTubePublisher(YOUTUBE_CONFIG)
            logger.info("✅ YouTube publisher initialized")
        
        # TikTok
        if TIKTOK_CONFIG.get('access_token'):
            self.publishers['tiktok'] = TikTokPublisher(TIKTOK_CONFIG)
            logger.info("✅ TikTok publisher initialized")
        
        # WhatsApp
        if WHATSAPP_CONFIG.get('access_token'):
            self.publishers['whatsapp_channel'] = WhatsAppPublisher(WHATSAPP_CONFIG)
            self.publishers['whatsapp_community'] = WhatsAppPublisher(WHATSAPP_CONFIG)
            self.publishers['whatsapp_status'] = WhatsAppPublisher(WHATSAPP_CONFIG)
            logger.info("✅ WhatsApp API publisher initialized")
    
    def _init_browser_automations(self):
        """Initialize browser automations for platforms without API."""
        if not self.use_browser:
            logger.info("Browser automation disabled")
            return
        
        logger.info("Initializing browser automations...")
        
        # WhatsApp Web (for Status)
        self.browser_automations['whatsapp_status'] = WhatsAppWebAutomation(
            headless=self.headless
        )
        logger.info("🌐 WhatsApp Web automation ready")
        
        # Instagram Web (for Stories)
        if INSTAGRAM_WEB_CONFIG.get('username') and INSTAGRAM_WEB_CONFIG.get('password'):
            self.browser_automations['instagram_status'] = InstagramWebAutomation(
                username=INSTAGRAM_WEB_CONFIG['username'],
                password=INSTAGRAM_WEB_CONFIG['password'],
                headless=self.headless
            )
            logger.info("🌐 Instagram Web automation ready")
        
        # Facebook Web (for Stories)
        if FACEBOOK_WEB_CONFIG.get('email') and FACEBOOK_WEB_CONFIG.get('password'):
            self.browser_automations['facebook_status'] = FacebookWebAutomation(
                email=FACEBOOK_WEB_CONFIG['email'],
                password=FACEBOOK_WEB_CONFIG['password'],
                headless=self.headless
            )
            self.browser_automations['facebook_reels'] = self.browser_automations['facebook_status']
            self.browser_automations['facebook_content'] = self.browser_automations['facebook_status']
            logger.info("🌐 Facebook Web automation ready")
        
        # Telegram Web
        self.browser_automations['telegram_status'] = TelegramWebAutomation(
            phone_number=TELEGRAM_WEB_CONFIG.get('phone'),
            headless=self.headless
        )
        logger.info("🌐 Telegram Web automation ready")
        
        # TikTok Web (fallback if no API)
        if TIKTOK_WEB_CONFIG.get('email') and TIKTOK_WEB_CONFIG.get('password'):
            self.browser_automations['tiktok'] = TikTokWebAutomation(
                email=TIKTOK_WEB_CONFIG['email'],
                password=TIKTOK_WEB_CONFIG['password'],
                headless=self.headless
            )
            logger.info("🌐 TikTok Web automation ready")
    
    async def publish_with_browser(self, platform: str, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish using browser automation."""
        if platform not in self.browser_automations:
            logger.error(f"No browser automation for {platform}")
            return False
        
        automation = self.browser_automations[platform]
        
        try:
            await automation.init_browser()
            
            if '_status' in platform or 'story' in platform.lower():
                success = await automation.publish_story(file_path, caption)
            elif 'reels' in platform:
                success = await automation.publish_reels(file_path, caption)
            else:
                success = await automation.publish_content(file_path, caption)
            
            return success
        except Exception as e:
            logger.error(f"Browser automation error for {platform}: {e}")
            return False
        finally:
            await automation.close_browser()
    
    async def process_command(self, command: str) -> dict:
        """Process a publishing command."""
        # Parse command
        parsed = self.parser.parse(command)
        
        if parsed['errors']:
            return {
                'success': False,
                'errors': parsed['errors'],
                'results': {}
            }
        
        file_path = parsed['file_path']
        platforms = parsed['platforms']
        caption = parsed['caption']
        
        results = {}
        
        logger.info(f"📤 Publishing {file_path.name} to {len(platforms)} platform(s)")
        
        for platform in platforms:
            publisher = self.publishers.get(platform)
            browser_automation = self.browser_automations.get(platform)
            
            success = False
            error_msg = None
            used_browser = False
            
            try:
                # Try API first
                if publisher:
                    logger.info(f"Using API publisher for {platform}")
                    # Determine publish method based on platform type
                    if '_status' in platform or 'story' in platform.lower():
                        success = await publisher.publish_story(file_path, caption)
                    elif 'reels' in platform:
                        success = await publisher.publish_reels(file_path, caption)
                    elif 'community' in platform:
                        success = await publisher.publish_to_community(file_path, caption)
                    else:
                        success = await publisher.publish_content(file_path, caption)
                    
                    # If API failed and we have browser automation, try that
                    if not success and browser_automation and self.use_browser:
                        logger.info(f"API failed, trying browser automation for {platform}")
                        success = await self.publish_with_browser(platform, file_path, caption)
                        used_browser = success
                
                # If no API publisher, try browser automation directly
                elif browser_automation and self.use_browser:
                    logger.info(f"Using browser automation for {platform}")
                    success = await self.publish_with_browser(platform, file_path, caption)
                    used_browser = success
                
                else:
                    error_msg = f'No publisher configured for {platform}'
                
                results[platform] = {
                    'success': success,
                    'used_browser': used_browser,
                    'error': error_msg if not success else None
                }
                
                if success:
                    logger.info(f"✅ Published to {platform}")
                else:
                    logger.error(f"❌ Failed to publish to {platform}")
                
                # Small delay between platforms
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Error publishing to {platform}: {str(e)}")
                results[platform] = {
                    'success': False,
                    'error': str(e)
                }
        
        success_count = sum(1 for r in results.values() if r['success'])
        
        return {
            'success': success_count > 0,
            'total': len(platforms),
            'successful': success_count,
            'failed': len(platforms) - success_count,
            'results': results
        }
    
    def get_status(self) -> dict:
        """Get status of all configured publishers."""
        return {
            'configured_platforms': list(self.publishers.keys()),
            'available_files': self.parser.get_available_files()
        }


async def main():
    """Main entry point."""
    publisher = SocialMediaPublisher()
    
    # Check if command provided as argument
    if len(sys.argv) > 1:
        command = ' '.join(sys.argv[1:])
        result = await publisher.process_command(command)
        
        if result['success']:
            print(f"\n✅ Успешно опубликовано: {result['successful']}/{result['total']}")
            for platform, res in result['results'].items():
                status = "✅" if res['success'] else "❌"
                print(f"  {status} {platform}")
        else:
            print(f"\n❌ Ошибки:")
            for error in result.get('errors', []):
                print(f"  - {error}")
            for platform, res in result['results'].items():
                if not res['success']:
                    print(f"  - {platform}: {res.get('error', 'Unknown error')}")
    else:
        # Interactive mode
        print("📱 Social Media Publisher")
        print("=" * 50)
        status = publisher.get_status()
        print(f"Настроено платформ: {len(status['configured_platforms'])}")
        print(f"Доступно файлов: {len(status['available_files'])}")
        print()
        print(publisher.parser.format_help())


if __name__ == '__main__':
    asyncio.run(main())
