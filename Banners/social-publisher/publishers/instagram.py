"""Instagram publisher using Meta Graph API."""
import aiohttp
from pathlib import Path
from typing import Optional
import logging
import asyncio

from .base import BasePublisher

logger = logging.getLogger(__name__)


class InstagramPublisher(BasePublisher):
    """Publisher for Instagram content and stories."""
    
    GRAPH_API_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.access_token = config.get('access_token')
        self.account_id = config.get('instagram_account_id')
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish content to Instagram feed."""
        if not self.validate_file(file_path, max_size_mb=30):
            return False
        
        media_type = self.get_media_type(file_path)
        
        try:
            if media_type == 'image':
                return await self._publish_image(file_path, caption)
            elif media_type == 'video':
                return await self._publish_video(file_path, caption)
            else:
                logger.error(f"Unsupported media type for Instagram: {media_type}")
                return False
        except Exception as e:
            await self.handle_error(e, "publishing content")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish story to Instagram."""
        if not self.validate_file(file_path, max_size_mb=30):
            return False
        
        media_type = self.get_media_type(file_path)
        
        try:
            if media_type == 'image':
                return await self._publish_story_image(file_path)
            elif media_type == 'video':
                return await self._publish_story_video(file_path)
            else:
                logger.error(f"Unsupported media type for Instagram story: {media_type}")
                return False
        except Exception as e:
            await self.handle_error(e, "publishing story")
            return False
    
    async def _publish_image(self, file_path: Path, caption: Optional[str]) -> bool:
        """Publish single image to Instagram feed."""
        url = f"{self.GRAPH_API_URL}/{self.account_id}/media"
        
        # Step 1: Create media container
        params = {
            'access_token': self.access_token,
            'image_url': f"file://{file_path.absolute()}",
        }
        if caption:
            params['caption'] = caption
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to create media container: {error_text}")
                    return False
                
                data = await response.json()
                creation_id = data.get('id')
            
            # Step 2: Publish the container
            await asyncio.sleep(2)  # Wait for processing
            
            publish_url = f"{self.GRAPH_API_URL}/{self.account_id}/media_publish"
            publish_params = {
                'access_token': self.access_token,
                'creation_id': creation_id,
            }
            
            async with session.post(publish_url, params=publish_params) as response:
                if response.status == 200:
                    logger.info("Image published to Instagram successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to publish image: {error_text}")
                    return False
    
    async def _publish_video(self, file_path: Path, caption: Optional[str]) -> bool:
        """Publish video to Instagram feed (Reel)."""
        url = f"{self.GRAPH_API_URL}/{self.account_id}/media"
        
        params = {
            'access_token': self.access_token,
            'media_type': 'REELS',
            'video_url': f"file://{file_path.absolute()}",
        }
        if caption:
            params['caption'] = caption
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to create video container: {error_text}")
                    return False
                
                data = await response.json()
                creation_id = data.get('id')
            
            # Wait for video processing
            await asyncio.sleep(10)
            
            # Publish
            publish_url = f"{self.GRAPH_API_URL}/{self.account_id}/media_publish"
            publish_params = {
                'access_token': self.access_token,
                'creation_id': creation_id,
            }
            
            async with session.post(publish_url, params=publish_params) as response:
                if response.status == 200:
                    logger.info("Video published to Instagram successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to publish video: {error_text}")
                    return False
    
    async def _publish_story_image(self, file_path: Path) -> bool:
        """Publish image story."""
        url = f"{self.GRAPH_API_URL}/{self.account_id}/media"
        
        params = {
            'access_token': self.access_token,
            'media_type': 'STORIES',
            'image_url': f"file://{file_path.absolute()}",
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to create story container: {error_text}")
                    return False
                
                data = await response.json()
                creation_id = data.get('id')
            
            await asyncio.sleep(2)
            
            publish_url = f"{self.GRAPH_API_URL}/{self.account_id}/media_publish"
            publish_params = {
                'access_token': self.access_token,
                'creation_id': creation_id,
            }
            
            async with session.post(publish_url, params=publish_params) as response:
                if response.status == 200:
                    logger.info("Story published to Instagram successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to publish story: {error_text}")
                    return False
    
    async def _publish_story_video(self, file_path: Path) -> bool:
        """Publish video story."""
        url = f"{self.GRAPH_API_URL}/{self.account_id}/media"
        
        params = {
            'access_token': self.access_token,
            'media_type': 'STORIES',
            'video_url': f"file://{file_path.absolute()}",
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to create video story container: {error_text}")
                    return False
                
                data = await response.json()
                creation_id = data.get('id')
            
            await asyncio.sleep(10)
            
            publish_url = f"{self.GRAPH_API_URL}/{self.account_id}/media_publish"
            publish_params = {
                'access_token': self.access_token,
                'creation_id': creation_id,
            }
            
            async with session.post(publish_url, params=publish_params) as response:
                if response.status == 200:
                    logger.info("Video story published to Instagram successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to publish video story: {error_text}")
                    return False
