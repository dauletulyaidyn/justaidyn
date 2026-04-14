"""Threads publisher using Meta Graph API."""
import aiohttp
from pathlib import Path
from typing import Optional
import logging
import asyncio

from .base import BasePublisher

logger = logging.getLogger(__name__)


class ThreadsPublisher(BasePublisher):
    """Publisher for Threads content."""
    
    GRAPH_API_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.access_token = config.get('access_token')
        # Threads uses the same account as Instagram Business
        self.account_id = config.get('instagram_account_id')
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish content to Threads."""
        if not self.validate_file(file_path, max_size_mb=30):
            return False
        
        media_type = self.get_media_type(file_path)
        
        try:
            if media_type == 'image':
                return await self._publish_image(file_path, caption)
            elif media_type == 'video':
                return await self._publish_video(file_path, caption)
            else:
                logger.error(f"Unsupported media type for Threads: {media_type}")
                return False
        except Exception as e:
            await self.handle_error(e, "publishing content")
            return False
    
    async def _publish_image(self, file_path: Path, caption: Optional[str]) -> bool:
        """Publish image to Threads."""
        # Step 1: Create media container
        url = f"{self.GRAPH_API_URL}/{self.account_id}/threads"
        
        params = {
            'access_token': self.access_token,
            'media_type': 'IMAGE',
            'image_url': f"file://{file_path.absolute()}",
        }
        if caption:
            params['text'] = caption
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to create Threads container: {error_text}")
                    return False
                
                data = await response.json()
                creation_id = data.get('id')
            
            # Step 2: Publish
            await asyncio.sleep(2)
            
            publish_url = f"{self.GRAPH_API_URL}/{self.account_id}/threads_publish"
            publish_params = {
                'access_token': self.access_token,
                'creation_id': creation_id,
            }
            
            async with session.post(publish_url, params=publish_params) as response:
                if response.status == 200:
                    logger.info("Image published to Threads successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to publish to Threads: {error_text}")
                    return False
    
    async def _publish_video(self, file_path: Path, caption: Optional[str]) -> bool:
        """Publish video to Threads."""
        url = f"{self.GRAPH_API_URL}/{self.account_id}/threads"
        
        params = {
            'access_token': self.access_token,
            'media_type': 'VIDEO',
            'video_url': f"file://{file_path.absolute()}",
        }
        if caption:
            params['text'] = caption
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to create Threads video container: {error_text}")
                    return False
                
                data = await response.json()
                creation_id = data.get('id')
            
            await asyncio.sleep(10)  # Video processing time
            
            publish_url = f"{self.GRAPH_API_URL}/{self.account_id}/threads_publish"
            publish_params = {
                'access_token': self.access_token,
                'creation_id': creation_id,
            }
            
            async with session.post(publish_url, params=publish_params) as response:
                if response.status == 200:
                    logger.info("Video published to Threads successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to publish video to Threads: {error_text}")
                    return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Threads doesn't have stories."""
        logger.warning("Threads doesn't support stories")
        return False
