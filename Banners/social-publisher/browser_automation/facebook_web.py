"""Facebook Web automation for Stories and Reels."""
import asyncio
from pathlib import Path
from typing import Optional
import logging

from .base_browser import BaseBrowserAutomation

logger = logging.getLogger(__name__)


class FacebookWebAutomation(BaseBrowserAutomation):
    """Automates Facebook Web for Stories and Reels publishing."""
    
    def __init__(self, email: str, password: str, headless: bool = False):
        super().__init__("facebook", headless)
        self.email = email
        self.password = password
        self.base_url = "https://www.facebook.com"
    
    async def login(self) -> bool:
        """Login to Facebook."""
        await self.page.goto(f"{self.base_url}/login/")
        
        # Check if already logged in
        if await self.is_logged_in('[aria-label="Create a post"]', timeout=5000) or \
           await self.is_logged_in('[data-testid="royal_menu_button"]', timeout=3000):
            logger.info("Already logged in to Facebook")
            return True
        
        try:
            logger.info("Logging in to Facebook...")
            
            # Wait for page to load and check URL
            await asyncio.sleep(3)
            current_url = self.page.url
            logger.info(f"Current URL: {current_url}")
            
            # Handle cookie consent if present
            try:
                await self.page.click('[data-cookiebanner="accept_button"]', timeout=3000)
                await asyncio.sleep(1)
            except:
                pass
            
            # Fill login form - try multiple selectors
            email_selectors = ['#email', 'input[name="email"]', 'input[type="text"]', 'input[placeholder*="Email" i]', 'input[placeholder*="Phone" i]']
            
            email_filled = False
            for selector in email_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=3000)
                    await self.page.fill(selector, self.email)
                    email_filled = True
                    logger.info(f"Filled email using {selector}")
                    break
                except:
                    continue
            
            if not email_filled:
                logger.error("Could not find email field")
                return False
            
            # Fill password
            pass_selectors = ['#pass', 'input[name="pass"]', 'input[type="password"]']
            
            for selector in pass_selectors:
                try:
                    await self.page.fill(selector, self.password)
                    break
                except:
                    continue
            
            # Click login - try multiple selectors
            login_selectors = ['[data-testid="royal_login_button"]', 'button[name="login"]', 'button[type="submit"]', 'button:has-text("Log In")']
            
            for selector in login_selectors:
                try:
                    await self.page.click(selector)
                    break
                except:
                    continue
            
            await asyncio.sleep(5)
            
            await asyncio.sleep(5)
            
            # Handle 2FA if needed
            try:
                # Wait for code input
                code_input = await self.page.query_selector('input[name="approvals_code"]')
                if code_input:
                    print("\n🔐 Введите код 2FA для Facebook в браузере...")
                    await asyncio.sleep(30)  # Give time to enter 2FA
            except:
                pass
            
            # Check if logged in
            if await self.is_logged_in('[aria-label="Create a post"]', timeout=5000):
                logger.info("Successfully logged in to Facebook")
                await self.save_session()
                return True
            else:
                logger.error("Failed to login to Facebook")
                return False
                
        except Exception as e:
            logger.error(f"Login error: {e}")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish story to Facebook."""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        try:
            if not await self.login():
                return False
            
            logger.info("Creating Facebook story...")
            
            # Navigate to stories
            await self.page.goto(f"{self.base_url}/stories/create/")
            await asyncio.sleep(3)
            
            # Upload photo/video
            file_input_selectors = [
                'input[type="file"]',
                'input[accept="image/*,image/heic,image/heif,video/*,video/mp4,video/x-m4v,video/x-matroska,.mkv"]',
            ]
            
            uploaded = False
            for selector in file_input_selectors:
                if await self.wait_and_upload(selector, file_path, timeout=10000):
                    uploaded = True
                    break
            
            if not uploaded:
                logger.error("Could not upload file to Facebook story")
                return False
            
            await asyncio.sleep(5)
            
            # Add caption/text
            if caption:
                try:
                    await self.page.fill('[aria-label="Start typing"]', caption)
                    await asyncio.sleep(1)
                except:
                    logger.warning("Could not add caption to story")
            
            # Click Share to Story
            await self.page.click('text=Share to Story', timeout=5000)
            
            logger.info(f"Story published to Facebook: {file_path.name}")
            await asyncio.sleep(3)
            return True
            
        except Exception as e:
            logger.error(f"Error publishing Facebook story: {e}")
            return False
    
    async def publish_reels(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish Reel to Facebook."""
        if not file_path.exists():
            return False
        
        try:
            if not await self.login():
                return False
            
            logger.info("Creating Facebook Reel...")
            
            # Navigate to Reels
            await self.page.goto(f"{self.base_url}/reels/create/")
            await asyncio.sleep(3)
            
            # Upload video
            await self.wait_and_upload('input[type="file"]', file_path)
            await asyncio.sleep(10)  # Videos take longer
            
            # Add caption
            if caption:
                await self.page.fill('[placeholder="Describe your reel..."]', caption)
            
            # Click Next/Post
            await self.page.click('text=Next', timeout=5000)
            await asyncio.sleep(2)
            await self.page.click('text=Share', timeout=5000)
            
            logger.info(f"Reel published to Facebook: {file_path.name}")
            await asyncio.sleep(3)
            return True
            
        except Exception as e:
            logger.error(f"Error publishing Facebook reel: {e}")
            return False
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish post to Facebook feed."""
        if not file_path.exists():
            return False
        
        try:
            if not await self.login():
                return False
            
            # Click Create post
            await self.page.click('[aria-label="Create a post"]', timeout=5000)
            await asyncio.sleep(2)
            
            # Add caption
            if caption:
                await self.page.fill('[aria-label="What\'s on your mind?"]', caption)
            
            # Add photo/video
            await self.page.click('text=Photo/video', timeout=3000)
            await asyncio.sleep(1)
            
            # Upload file
            await self.wait_and_upload('input[type="file"]', file_path)
            await asyncio.sleep(5)
            
            # Post
            await self.page.click('text=Post', timeout=5000)
            
            logger.info(f"Post published to Facebook: {file_path.name}")
            await asyncio.sleep(3)
            return True
            
        except Exception as e:
            logger.error(f"Error publishing Facebook post: {e}")
            return False
