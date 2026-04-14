"""WhatsApp Business API publisher."""
import aiohttp
from pathlib import Path
from typing import Optional
import logging
import base64

from .base import BasePublisher

logger = logging.getLogger(__name__)


class WhatsAppPublisher(BasePublisher):
    """Publisher for WhatsApp Channel, Community, and Status."""
    
    API_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.access_token = config.get('access_token')
        self.phone_number_id = config.get('phone_number_id')
        self.channel_id = config.get('channel_id')
        self.community_id = config.get('community_id')
    
    async def _upload_media(self, file_path: Path) -> Optional[str]:
        """Upload media to WhatsApp servers and return media ID."""
        url = f"{self.API_URL}/{self.phone_number_id}/media"
        
        async with aiohttp.ClientSession() as session:
            with open(file_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename=file_path.name)
                data.add_field('messaging_product', 'whatsapp')
                data.add_field('type', 'image' if self.get_media_type(file_path) == 'image' else 'video')
                
                headers = {
                    'Authorization': f'Bearer {self.access_token}'
                }
                
                async with session.post(url, data=data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get('id')
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to upload media: {error_text}")
                        return None
    
    async def _send_message(self, to: str, media_id: str, caption: Optional[str] = None) -> bool:
        """Send media message."""
        url = f"{self.API_URL}/{self.phone_number_id}/messages"
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'messaging_product': 'whatsapp',
            'recipient_type': 'individual',
            'to': to,
            'type': 'image',
            'image': {
                'id': media_id,
                'caption': caption or ''
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, headers=headers) as response:
                if response.status == 200:
                    logger.info("Message sent successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to send message: {error_text}")
                    return False
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish to WhatsApp Channel."""
        if not self.validate_file(file_path, max_size_mb=16):
            return False
        
        try:
            media_id = await self._upload_media(file_path)
            if not media_id:
                return False
            
            # Publish to channel
            if self.channel_id:
                return await self._send_message(self.channel_id, media_id, caption)
            else:
                logger.warning("WhatsApp channel_id not configured")
                return False
                
        except Exception as e:
            await self.handle_error(e, "publishing to WhatsApp channel")
            return False
    
    async def publish_to_community(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish to WhatsApp Community."""
        if not self.validate_file(file_path, max_size_mb=16):
            return False
        
        try:
            media_id = await self._upload_media(file_path)
            if not media_id:
                return False
            
            if self.community_id:
                return await self._send_message(self.community_id, media_id, caption)
            else:
                logger.warning("WhatsApp community_id not configured")
                return False
                
        except Exception as e:
            await self.handle_error(e, "publishing to WhatsApp community")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish WhatsApp Status."""
        # WhatsApp Status API is very limited
        # Usually requires specific partner access or device emulation
        logger.warning("WhatsApp Status publishing requires special access. "
                      "Consider using WhatsApp Business API with Status feature or manual posting.")
        return False
