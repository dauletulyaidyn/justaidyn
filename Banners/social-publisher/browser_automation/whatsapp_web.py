"""WhatsApp Web automation for Status publishing."""
import asyncio
from pathlib import Path
from typing import Optional
import logging
from datetime import datetime

from .base_browser import BaseBrowserAutomation

logger = logging.getLogger(__name__)


class WhatsAppWebAutomation(BaseBrowserAutomation):
    """Automates WhatsApp Web for Status publishing."""
    
    def __init__(self, headless: bool = False):
        super().__init__("whatsapp", headless)
        self.base_url = "https://web.whatsapp.com"
    
    async def login(self) -> bool:
        """Login to WhatsApp Web via QR code."""
        await self.page.goto(self.base_url)
        
        # Check if already logged in
        if await self.is_logged_in('[data-testid="chat-list"]') or \
           await self.is_logged_in('[data-tab="2"]', timeout=5000):
            logger.info("Already logged in to WhatsApp Web")
            return True
        
        # Wait for QR code scan
            logger.info("Waiting for WhatsApp QR code scan...")
            print("\n[WhatsApp] Отсканируйте QR-код в браузере для входа")
            print("У вас есть 60 секунд...")
        
        try:
            # Wait for QR to be scanned (chat list or main interface appears)
            await self.page.wait_for_selector(
                '[data-testid="chat-list"], [data-tab="2"], [title="Status"]',
                timeout=60000
            )
            logger.info("Successfully logged in to WhatsApp Web")
            await self.save_session()
            return True
        except Exception as e:
            logger.error(f"Login timeout or error: {e}")
            return False
    
    async def publish_status(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish status to WhatsApp."""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        try:
            # Ensure logged in
            if not await self.login():
                return False
            
            # Navigate to status
            logger.info("Opening Status section...")
            
            # Click on Status icon or menu
            status_selectors = [
                '[data-testid="status-tab"]',  # Status tab
                '[title="Status"]',             # Status title
                'span[data-icon="status"]',     # Status icon
                '[data-tab="3"]',               # Alternative tab
            ]
            
            status_clicked = False
            for selector in status_selectors:
                if await self.safe_click(selector, timeout=3000):
                    status_clicked = True
                    break
            
            if not status_clicked:
                # Try to find and click via text
                await self.page.click('text=Status', timeout=3000)
            
            await asyncio.sleep(2)
            
            # Click on "My status" or add status button
            add_status_selectors = [
                'text=My status',
                '[data-testid="status-add"]', 
                'button:has-text("Add status")',
                '[data-icon="plus"]',  # Plus icon
            ]
            
            add_clicked = False
            for selector in add_status_selectors:
                if await self.safe_click(selector, timeout=3000):
                    add_clicked = True
                    break
            
            if not add_clicked:
                logger.error("Could not find Add Status button")
                return False
            
            await asyncio.sleep(2)
            
            # Upload file - look for file input
            file_input_selectors = [
                'input[type="file"]',  # Standard file input
                '[accept="image/*,video/*"]',  # Image/video accept
                '[accept="image/jpeg,image/jpg,image/png,video/mp4,video/3gpp"]',  # WhatsApp specific
            ]
            
            uploaded = False
            for selector in file_input_selectors:
                if await self.wait_and_upload(selector, file_path, timeout=5000):
                    uploaded = True
                    break
            
            if not uploaded:
                logger.error("Could not upload file to status")
                return False
            
            await asyncio.sleep(3)  # Wait for upload
            
            # Add caption if provided
            if caption:
                caption_selectors = [
                    '[data-testid="status-caption-input"]',
                    '[contenteditable="true"]',
                    'div[role="textbox"]',
                ]
                
                for selector in caption_selectors:
                    if await self.safe_fill(selector, caption, timeout=3000):
                        break
            
            await asyncio.sleep(1)
            
            # Click send/publish button
            send_selectors = [
                '[data-testid="status-send"]',  
                '[data-testid="send"]',         
                '[data-icon="send"]',           
                'button:has-text("Send")',
                'button:has-text("Publish")',
            ]
            
            sent = False
            for selector in send_selectors:
                if await self.safe_click(selector, timeout=3000):
                    sent = True
                    break
            
            if sent:
                logger.info(f"Status published successfully: {file_path.name}")
                await asyncio.sleep(2)
                return True
            else:
                logger.error("Could not find send button")
                return False
                
        except Exception as e:
            logger.error(f"Error publishing WhatsApp status: {e}")
            return False
    
    async def publish_to_channel(self, file_path: Path, channel_name: str, caption: Optional[str] = None) -> bool:
        """Publish to WhatsApp Channel."""
        if not file_path.exists():
            return False
        
        try:
            if not await self.login():
                return False
            
            # Click on Channels
            await self.page.click('text=Channels', timeout=5000)
            await asyncio.sleep(2)
            
            # Find and click on specific channel
            await self.page.click(f'text={channel_name}', timeout=5000)
            await asyncio.sleep(2)
            
            # Click attachment/clip icon
            await self.page.click('[data-testid="clip"]', timeout=3000)
            await asyncio.sleep(1)
            
            # Upload file
            await self.wait_and_upload('input[type="file"]', file_path)
            await asyncio.sleep(3)
            
            # Add caption
            if caption:
                await self.page.fill('[placeholder="Add a caption"]', caption)
            
            # Send
            await self.page.click('[data-testid="send"]', timeout=3000)
            
            logger.info(f"Published to WhatsApp channel: {channel_name}")
            await asyncio.sleep(2)
            return True
            
        except Exception as e:
            logger.error(f"Error publishing to WhatsApp channel: {e}")
            return False
