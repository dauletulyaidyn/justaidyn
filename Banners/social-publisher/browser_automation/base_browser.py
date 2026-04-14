"""Base browser automation class using Playwright."""
import asyncio
from pathlib import Path
from typing import Optional
import logging
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

logger = logging.getLogger(__name__)


class BaseBrowserAutomation:
    """Base class for browser-based social media automation."""
    
    def __init__(self, platform_name: str, headless: bool = False):
        self.platform_name = platform_name
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.playwright = None
        self.storage_state_path = Path(f"browser_data/{platform_name}_state.json")
        self.storage_state_path.parent.mkdir(exist_ok=True)
    
    async def init_browser(self):
        """Initialize browser instance."""
        self.playwright = await async_playwright().start()
        
        # Launch browser
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        # Create context with saved state if exists
        storage_state = None
        if self.storage_state_path.exists():
            storage_state = str(self.storage_state_path)
            logger.info(f"Loading saved session for {self.platform_name}")
        
        self.context = await self.browser.new_context(
            storage_state=storage_state,
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        # Disable webdriver detection
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)
        
        self.page = await self.context.new_page()
        logger.info(f"Browser initialized for {self.platform_name}")
    
    async def save_session(self):
        """Save browser session for future use."""
        if self.context:
            await self.context.storage_state(path=str(self.storage_state_path))
            logger.info(f"Session saved for {self.platform_name}")
    
    async def close_browser(self):
        """Close browser and cleanup."""
        await self.save_session()
        
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        
        logger.info(f"Browser closed for {self.platform_name}")
    
    async def safe_click(self, selector: str, timeout: int = 5000):
        """Safely click element with retry."""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            await self.page.click(selector)
            return True
        except Exception as e:
            logger.error(f"Failed to click {selector}: {e}")
            return False
    
    async def safe_fill(self, selector: str, text: str, timeout: int = 5000):
        """Safely fill input with retry."""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            await self.page.fill(selector, text)
            return True
        except Exception as e:
            logger.error(f"Failed to fill {selector}: {e}")
            return False
    
    async def wait_and_upload(self, file_input_selector: str, file_path: Path, timeout: int = 10000):
        """Wait for file input and upload file."""
        try:
            await self.page.wait_for_selector(file_input_selector, timeout=timeout, state='visible')
            
            # Set file
            input_element = await self.page.query_selector(file_input_selector)
            if input_element:
                await input_element.set_input_files(str(file_path))
                logger.info(f"File uploaded: {file_path.name}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            return False
    
    async def is_logged_in(self, check_selector: str, timeout: int = 3000) -> bool:
        """Check if user is logged in."""
        try:
            await self.page.wait_for_selector(check_selector, timeout=timeout)
            return True
        except:
            return False
