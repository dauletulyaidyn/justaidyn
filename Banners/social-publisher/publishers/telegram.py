"""Telegram publisher implementation."""
import aiohttp
from pathlib import Path
from typing import Optional
import logging

from .base import BasePublisher

logger = logging.getLogger(__name__)


class TelegramPublisher(BasePublisher):
    """Publisher for Telegram channels and personal messages."""
    
    BASE_URL = "https://api.telegram.org/bot{token}"
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.token = config.get('bot_token')
        self.channel_id = config.get('channel_id')
        self.user_id = config.get('user_id')
        self.base_url = self.BASE_URL.format(token=self.token)
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish content to Telegram channel."""
        if not self.validate_file(file_path, max_size_mb=20):
            return False
        
        media_type = self.get_media_type(file_path)
        
        try:
            if media_type == 'image':
                return await self._send_photo(file_path, caption, self.channel_id)
            elif media_type == 'video':
                return await self._send_video(file_path, caption, self.channel_id)
            else:
                logger.error(f"Unsupported media type for Telegram: {media_type}")
                return False
        except Exception as e:
            await self.handle_error(e, "publishing content")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish to personal Telegram (as message since Telegram doesn't have 'stories' for bots)."""
        if not self.user_id:
            logger.warning("Telegram user_id not configured, skipping story")
            return False
        
        if not self.validate_file(file_path, max_size_mb=10):
            return False
        
        media_type = self.get_media_type(file_path)
        
        try:
            if media_type == 'image':
                return await self._send_photo(file_path, caption, self.user_id)
            elif media_type == 'video':
                return await self._send_video(file_path, caption, self.user_id)
            else:
                logger.error(f"Unsupported media type for Telegram: {media_type}")
                return False
        except Exception as e:
            await self.handle_error(e, "publishing story")
            return False
    
    async def _send_photo(self, file_path: Path, caption: Optional[str], chat_id: str) -> bool:
        """Send photo to Telegram."""
        url = f"{self.base_url}/sendPhoto"
        
        async with aiohttp.ClientSession() as session:
            with open(file_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('chat_id', chat_id)
                data.add_field('photo', f, filename=file_path.name)
                if caption:
                    data.add_field('caption', caption)
                
                async with session.post(url, data=data) as response:
                    if response.status == 200:
                        logger.info(f"Photo sent successfully to Telegram")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send photo: {error_text}")
                        return False
    
    async def _send_video(self, file_path: Path, caption: Optional[str], chat_id: str) -> bool:
        """Send video to Telegram."""
        url = f"{self.base_url}/sendVideo"
        
        async with aiohttp.ClientSession() as session:
            with open(file_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('chat_id', chat_id)
                data.add_field('video', f, filename=file_path.name)
                if caption:
                    data.add_field('caption', caption)
                
                async with session.post(url, data=data) as response:
                    if response.status == 200:
                        logger.info(f"Video sent successfully to Telegram")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send video: {error_text}")
                        return False
