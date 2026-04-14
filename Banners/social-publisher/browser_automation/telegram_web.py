"""Telegram Web automation for Status/Stories."""
import asyncio
from pathlib import Path
from typing import Optional
import logging

from .base_browser import BaseBrowserAutomation

logger = logging.getLogger(__name__)


class TelegramWebAutomation(BaseBrowserAutomation):
    """Automates Telegram Web for Stories publishing."""
    
    def __init__(self, phone_number: Optional[str] = None, headless: bool = False):
        super().__init__("telegram_web", headless)
        self.phone_number = phone_number
        self.base_url = "https://web.telegram.org"
    
    async def login(self) -> bool:
        """Login to Telegram Web."""
        await self.page.goto(self.base_url)
        
        # Check if already logged in
        if await self.is_logged_in('.chat-list', timeout=5000) or \
           await self.is_logged_in('[class*="chat-list"]', timeout=3000):
            logger.info("Already logged in to Telegram Web")
            return True
        
        try:
            logger.info("Logging in to Telegram Web...")
            
            # Click "Log in by phone Number"
            await self.page.click('text=Log in by phone Number', timeout=10000)
            await asyncio.sleep(1)
            
            if self.phone_number:
                # Fill phone number
                await self.page.fill('input[type="tel"]', self.phone_number)
                await self.page.click('button[type="submit"]')
                
                print(f"\n📱 Введите код подтверждения Telegram, отправленный на {self.phone_number}")
                print("У вас есть 60 секунд...")
                
                # Wait for login
                await self.page.wait_for_selector('.chat-list', timeout=60000)
            else:
                print("\n📱 Отсканируйте QR-код в браузере для входа в Telegram Web")
                print("У вас есть 60 секунд...")
                
                # Wait for QR scan
                await self.page.wait_for_selector('.chat-list', timeout=60000)
            
            logger.info("Successfully logged in to Telegram Web")
            await self.save_session()
            return True
            
        except Exception as e:
            logger.error(f"Login error: {e}")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish story to Telegram (using My Stories channel)."""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        try:
            if not await self.login():
                return False
            
            logger.info("Creating Telegram story...")
            
            # Click on Stories icon
            try:
                await self.page.click('[class*="stories"]', timeout=5000)
            except:
                # Try menu
                await self.page.click('text=My Stories', timeout=5000)
            
            await asyncio.sleep(2)
            
            # Click Add Story
            await self.page.click('text=Add Story', timeout=5000)
            await asyncio.sleep(1)
            
            # Upload file
            await self.wait_and_upload('input[type="file"]', file_path)
            await asyncio.sleep(3)
            
            # Add caption
            if caption:
                try:
                    await self.page.fill('[contenteditable="true"]', caption)
                    await asyncio.sleep(1)
                except:
                    logger.warning("Could not add caption")
            
            # Send
            await self.page.click('text=Send', timeout=5000)
            
            logger.info(f"Story published to Telegram: {file_path.name}")
            await asyncio.sleep(2)
            return True
            
        except Exception as e:
            logger.error(f"Error publishing Telegram story: {e}")
            return False
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish to Telegram Saved Messages or specific chat."""
        if not file_path.exists():
            return False
        
        try:
            if not await self.login():
                return False
            
            # Open Saved Messages
            await self.page.click('text=Saved Messages', timeout=5000)
            await asyncio.sleep(2)
            
            # Click attachment
            await self.page.click('[title="Attach media"]', timeout=3000)
            await asyncio.sleep(1)
            
            # Upload file
            await self.wait_and_upload('input[type="file"]', file_path)
            await asyncio.sleep(3)
            
            # Add caption
            if caption:
                await self.page.fill('[contenteditable="true"]', caption)
            
            # Send
            await self.page.click('text=Send', timeout=5000)
            
            logger.info(f"Published to Telegram: {file_path.name}")
            await asyncio.sleep(2)
            return True
            
        except Exception as e:
            logger.error(f"Error publishing to Telegram: {e}")
            return False
