"""Instagram Web automation for Stories publishing."""
import asyncio
from pathlib import Path
from typing import Optional
import logging

from .base_browser import BaseBrowserAutomation

logger = logging.getLogger(__name__)


class InstagramWebAutomation(BaseBrowserAutomation):
    """Automates Instagram Web for Stories publishing."""
    
    def __init__(self, username: str, password: str, headless: bool = False):
        super().__init__("instagram", headless)
        self.username = username
        self.password = password
        self.base_url = "https://www.instagram.com"
    
    async def login(self) -> bool:
        """Login to Instagram."""
        await self.page.goto(f"{self.base_url}/accounts/login/")
        
        # Check if already logged in
        if await self.is_logged_in('[data-testid="new-post-button"]', timeout=5000) or \
           await self.is_logged_in('svg[aria-label="New post"]', timeout=3000):
            logger.info("Already logged in to Instagram")
            return True
        
        # Fill login form
        logger.info("Logging in to Instagram...")
        
        try:
            # Wait for and fill username
            await self.page.wait_for_selector('input[name="username"]', timeout=10000)
            await self.page.fill('input[name="username"]', self.username)
            await self.page.fill('input[name="password"]', self.password)
            
            # Click login button
            await self.page.click('button[type="submit"]')
            
            # Wait for login to complete
            await asyncio.sleep(3)
            
            # Handle "Save Your Login Info" popup
            try:
                await self.page.click('text=Not Now', timeout=5000)
            except:
                pass
            
            # Handle notifications popup
            try:
                await self.page.click('text=Not Now', timeout=5000)
            except:
                pass
            
            # Check if logged in
            if await self.is_logged_in('[data-testid="new-post-button"]', timeout=5000):
                logger.info("Successfully logged in to Instagram")
                await self.save_session()
                return True
            else:
                logger.error("Failed to login to Instagram")
                return False
                
        except Exception as e:
            logger.error(f"Login error: {e}")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish story to Instagram."""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        try:
            # Ensure logged in
            if not await self.login():
                return False
            
            # Click "Create" or "New post" button
            logger.info("Creating new story...")
            
            create_selectors = [
                '[data-testid="new-post-button"]',
                'svg[aria-label="New post"]',
                'svg[aria-label="New Post"]',
                'a[href="#"] svg[aria-label="Plus icon"]',
            ]
            
            for selector in create_selectors:
                try:
                    await self.page.click(selector, timeout=3000)
                    break
                except:
                    continue
            
            await asyncio.sleep(2)
            
            # Select "Story" option
            try:
                await self.page.click('text=Story', timeout=5000)
            except:
                # Might be a different menu structure
                pass
            
            await asyncio.sleep(2)
            
            # Upload file
            file_input_selectors = [
                'input[type="file"]',
                'input[accept="image/jpeg,image/png,video/mp4,video/quicktime"]',
                'input[accept="image/*,video/*"]',
            ]
            
            uploaded = False
            for selector in file_input_selectors:
                if await self.wait_and_upload(selector, file_path, timeout=10000):
                    uploaded = True
                    break
            
            if not uploaded:
                logger.error("Could not upload file to Instagram story")
                return False
            
            await asyncio.sleep(5)  # Wait for image/video to load
            
            # Add text/caption if provided
            if caption:
                try:
                    # Click text button
                    await self.page.click('[aria-label="Text"]')
                    await asyncio.sleep(1)
                    # Type text
                    await self.page.keyboard.type(caption)
                    await asyncio.sleep(1)
                    # Click done
                    await self.page.click('text=Done')
                    await asyncio.sleep(1)
                except Exception as e:
                    logger.warning(f"Could not add caption: {e}")
            
            # Click "Your Story" or share button
            share_selectors = [
                'text=Your story',
                'text=Share to Your Story',
                'text=Share',
                'button:has-text("Share")',
            ]
            
            shared = False
            for selector in share_selectors:
                try:
                    await self.page.click(selector, timeout=5000)
                    shared = True
                    break
                except:
                    continue
            
            if shared:
                logger.info(f"Story published successfully: {file_path.name}")
                await asyncio.sleep(3)
                return True
            else:
                logger.error("Could not find share button")
                return False
                
        except Exception as e:
            logger.error(f"Error publishing Instagram story: {e}")
            return False
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish regular post to Instagram feed."""
        if not file_path.exists():
            return False
        
        try:
            if not await self.login():
                return False
            
            # Click create post
            await self.page.click('[data-testid="new-post-button"]', timeout=5000)
            await asyncio.sleep(2)
            
            # Upload file
            await self.wait_and_upload('input[type="file"]', file_path)
            await asyncio.sleep(5)
            
            # Click Next twice
            await self.page.click('text=Next', timeout=5000)
            await asyncio.sleep(1)
            await self.page.click('text=Next', timeout=5000)
            await asyncio.sleep(1)
            
            # Add caption
            if caption:
                await self.page.fill('textarea[aria-label="Write a caption…"]', caption)
            
            # Share
            await self.page.click('text=Share', timeout=5000)
            
            logger.info(f"Post published to Instagram: {file_path.name}")
            await asyncio.sleep(3)
            return True
            
        except Exception as e:
            logger.error(f"Error publishing Instagram post: {e}")
            return False
