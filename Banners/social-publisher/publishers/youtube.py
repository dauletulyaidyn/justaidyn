"""YouTube publisher for Shorts."""
import aiohttp
from pathlib import Path
from typing import Optional
import logging
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import google.auth.transport.requests

from .base import BasePublisher

logger = logging.getLogger(__name__)


class YouTubePublisher(BasePublisher):
    """Publisher for YouTube Shorts."""
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.refresh_token = config.get('refresh_token')
        self.channel_id = config.get('channel_id')
        self.credentials = None
        self.youtube = None
    
    def _get_credentials(self):
        """Get or refresh OAuth credentials."""
        if not self.credentials:
            self.credentials = Credentials(
                token=None,
                refresh_token=self.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=['https://www.googleapis.com/auth/youtube.upload']
            )
        
        # Refresh if expired
        if self.credentials.expired:
            request = google.auth.transport.requests.Request()
            self.credentials.refresh(request)
        
        return self.credentials
    
    def _get_youtube_service(self):
        """Get YouTube API service."""
        if not self.youtube:
            credentials = self._get_credentials()
            self.youtube = build('youtube', 'v3', credentials=credentials)
        return self.youtube
    
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish video to YouTube as Shorts."""
        if not self.validate_file(file_path, max_size_mb=256):
            return False
        
        if self.get_media_type(file_path) != 'video':
            logger.error("YouTube only supports video uploads")
            return False
        
        try:
            youtube = self._get_youtube_service()
            
            body = {
                'snippet': {
                    'title': caption or 'Short Video',
                    'description': caption or '',
                    'tags': ['shorts', 'short'],
                    'categoryId': '22'  # People & Blogs
                },
                'status': {
                    'privacyStatus': 'public'
                }
            }
            
            # Insert video
            media = MediaFileUpload(
                str(file_path),
                mimetype='video/mp4',
                resumable=True
            )
            
            request = youtube.videos().insert(
                part='snippet,status',
                body=body,
                media_body=media
            )
            
            response = request.execute()
            
            if response.get('id'):
                logger.info(f"Video uploaded to YouTube: https://youtube.com/shorts/{response['id']}")
                return True
            else:
                logger.error("Failed to upload video to YouTube")
                return False
                
        except Exception as e:
            await self.handle_error(e, "uploading to YouTube")
            return False
    
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """YouTube doesn't have stories, publish as Shorts instead."""
        logger.info("YouTube doesn't have stories, publishing as Shorts instead")
        return await self.publish_content(file_path, caption)
