"""TikTok publisher implementation."""
import aiohttp
from pathlib import Path
from typing import Optional
import logging

from .base import BasePublisher

logger = logging.getLogger(__name__)


class TikTokPublisher(BasePublisher):
    """Publisher for TikTok content."""
    
    API_URL = "https://open-api.tiktok.com"
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.access_token = config.get('access_token')
        self.open_id = config.get('open_id')
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish video to TikTok."""
        if not self.validate_file(file_path, max_size_mb=500):
            return False
        
        if self.get_media_type(file_path) != 'video':
            logger.error("TikTok only supports video uploads")
            return False
        
        try:
            # Step 1: Initialize upload
            init_url = f"{self.API_URL}/share/video/upload/"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            init_data = {
                'open_id': self.open_id,
                'access_token': self.access_token,
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(init_url, headers=headers, json=init_data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Failed to initialize TikTok upload: {error_text}")
                        return False
                    
                    init_result = await response.json()
                    upload_url = init_result.get('data', {}).get('upload_url')
                
                if not upload_url:
                    logger.error("No upload URL received from TikTok")
                    return False
                
                # Step 2: Upload video file
                with open(file_path, 'rb') as f:
                    data = aiohttp.FormData()
                    data.add_field('video', f, filename=file_path.name, content_type='video/mp4')
                    
                    async with session.post(upload_url, data=data) as upload_response:
                        if upload_response.status == 200:
                            logger.info("Video uploaded to TikTok successfully")
                            return True
                        else:
                            error_text = await upload_response.text()
                            logger.error(f"Failed to upload to TikTok: {error_text}")
                            return False
        except Exception as e:
            await self.handle_error(e, "publishing to TikTok")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """TikTok doesn't have stories, publish as regular content."""
        logger.info("TikTok doesn't have stories, publishing as regular content")
        return await self.publish_content(file_path, caption)
