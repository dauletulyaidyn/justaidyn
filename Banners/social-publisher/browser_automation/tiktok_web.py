"""TikTok Web automation for content publishing."""
import asyncio
from pathlib import Path
from typing import Optional
import logging

from .base_browser import BaseBrowserAutomation

logger = logging.getLogger(__name__)


class TikTokWebAutomation(BaseBrowserAutomation):
    """Automates TikTok Web for video publishing."""
    
    def __init__(self, email: Optional[str] = None, password: Optional[str] = None, headless: bool = False):
        super().__init__("tiktok", headless)
        self.email = email
        self.password = password
        self.base_url = "https://www.tiktok.com"
    
    async def login(self) -> bool:
        """Login to TikTok."""
        await self.page.goto(f"{self.base_url}/login")
        
        # Check if already logged in
        if await self.is_logged_in('[data-e2e="nav-profile"]', timeout=5000):
            logger.info("Already logged in to TikTok")
            return True
        
        try:
            logger.info("Logging in to TikTok...")
            
            # Click "Use phone/email/username"
            await self.page.click('text=Use phone / email / username', timeout=5000)
            await asyncio.sleep(1)
            
            # Click Email tab
            await self.page.click('text=Email', timeout=3000)
            await asyncio.sleep(1)
            
            if self.email and self.password:
                # Fill credentials
                await self.page.fill('input[name="email"]', self.email)
                await self.page.fill('input[type="password"]', self.password)
                
                # Click login
                await self.page.click('button[type="submit"]', timeout=3000)
                
                # Handle captcha if appears
                try:
                    print("\n🤖 Если появилась капча, пожалуйста, решите её в браузере")
                    print("У вас есть 60 секунд...")
                    await self.page.wait_for_selector('[data-e2e="nav-profile"]', timeout=60000)
                except:
                    pass
            else:
                print("\n📱 Войдите в TikTok вручную через браузер")
                print("У вас есть 60 секунд...")
                await self.page.wait_for_selector('[data-e2e="nav-profile"]', timeout=60000)
            
            logger.info("Successfully logged in to TikTok")
            await self.save_session()
            return True
            
        except Exception as e:
            logger.error(f"Login error: {e}")
            return False
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish video to TikTok."""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        # TikTok only accepts video
        if self.get_media_type(file_path) != 'video':
            logger.error("TikTok only supports video uploads")
            return False
        
        try:
            if not await self.login():
                return False
            
            logger.info("Uploading video to TikTok...")
            
            # Navigate to upload page
            await self.page.goto(f"{self.base_url}/upload")
            await asyncio.sleep(3)
            
            # Wait for and click "Select file to upload"
            await self.page.wait_for_selector('text=Select file to upload', timeout=10000)
            
            # Upload file
            await self.wait_and_upload('input[type="file"]', file_path, timeout=10000)
            await asyncio.sleep(10)  # TikTok takes time to process
            
            # Add caption
            if caption:
                try:
                    # Click caption area
                    await self.page.click('[data-e2e="edit-caption"]')
                    await asyncio.sleep(1)
                    # Type caption
                    await self.page.keyboard.type(caption)
                    await asyncio.sleep(1)
                except Exception as e:
                    logger.warning(f"Could not add caption: {e}")
            
            # Click Post
            await self.page.click('text=Post', timeout=10000)
            
            # Wait for upload to complete
            print("⏳ Ждем завершения загрузки видео...")
            await asyncio.sleep(15)
            
            logger.info(f"Video published to TikTok: {file_path.name}")
            return True
            
        except Exception as e:
            logger.error(f"Error publishing to TikTok: {e}")
            return False
    
    def get_media_type(self, file_path: Path) -> str:
        """Check media type."""
        ext = file_path.suffix.lower()
        video_exts = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
        return 'video' if ext in video_exts else 'image'
