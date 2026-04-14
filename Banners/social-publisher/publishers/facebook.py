"""Facebook publisher using Meta Graph API."""
import aiohttp
from pathlib import Path
from typing import Optional
import logging

from .base import BasePublisher

logger = logging.getLogger(__name__)


class FacebookPublisher(BasePublisher):
    """Publisher for Facebook content, reels, and stories."""
    
    GRAPH_API_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.access_token = config.get('access_token')
        self.page_id = config.get('facebook_page_id')
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish content to Facebook page."""
        if not self.validate_file(file_path, max_size_mb=50):
            return False
        
        media_type = self.get_media_type(file_path)
        url = f"{self.GRAPH_API_URL}/{self.page_id}/photos" if media_type == 'image' else f"{self.GRAPH_API_URL}/{self.page_id}/videos"
        
        try:
            async with aiohttp.ClientSession() as session:
                with open(file_path, 'rb') as f:
                    data = aiohttp.FormData()
                    if media_type == 'image':
                        data.add_field('file', f, filename=file_path.name)
                    else:
                        data.add_field('file', f, filename=file_path.name, content_type='video/mp4')
                    
                    if caption:
                        data.add_field('caption' if media_type == 'image' else 'description', caption)
                    data.add_field('access_token', self.access_token)
                    
                    async with session.post(url, data=data) as response:
                        if response.status == 200:
                            logger.info("Content published to Facebook successfully")
                            return True
                        else:
                            error_text = await response.text()
                            logger.error(f"Failed to publish to Facebook: {error_text}")
                            return False
        except Exception as e:
            await self.handle_error(e, "publishing content")
            return False
    
    async def publish_reels(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish Reels to Facebook page."""
        if not self.validate_file(file_path, max_size_mb=100):
            return False
        
        # Facebook Reels API endpoint
        url = f"{self.GRAPH_API_URL}/{self.page_id}/video_reels"
        
        try:
            async with aiohttp.ClientSession() as session:
                with open(file_path, 'rb') as f:
                    data = aiohttp.FormData()
                    data.add_field('file', f, filename=file_path.name, content_type='video/mp4')
                    if caption:
                        data.add_field('description', caption)
                    data.add_field('access_token', self.access_token)
                    
                    async with session.post(url, data=data) as response:
                        if response.status == 200:
                            logger.info("Reel published to Facebook successfully")
                            return True
                        else:
                            error_text = await response.text()
                            logger.error(f"Failed to publish reel to Facebook: {error_text}")
                            return False
        except Exception as e:
            await self.handle_error(e, "publishing reel")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish story to Facebook page."""
        if not self.validate_file(file_path, max_size_mb=30):
            return False
        
        media_type = self.get_media_type(file_path)
        url = f"{self.GRAPH_API_URL}/{self.page_id}/photos" if media_type == 'image' else f"{self.GRAPH_API_URL}/{self.page_id}/videos"
        
        try:
            async with aiohttp.ClientSession() as session:
                with open(file_path, 'rb') as f:
                    data = aiohttp.FormData()
                    if media_type == 'image':
                        data.add_field('file', f, filename=file_path.name)
                    else:
                        data.add_field('file', f, filename=file_path.name, content_type='video/mp4')
                    
                    data.add_field('access_token', self.access_token)
                    data.add_field('published', 'false')  # For stories
                    data.add_field('unpublished_content_type', 'STORY')
                    
                    async with session.post(url, data=data) as response:
                        if response.status == 200:
                            logger.info("Story published to Facebook successfully")
                            return True
                        else:
                            error_text = await response.text()
                            logger.error(f"Failed to publish story to Facebook: {error_text}")
                            return False
        except Exception as e:
            await self.handle_error(e, "publishing story")
            return False
