"""Base publisher class for all social media platforms."""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class BasePublisher(ABC):
    """Abstract base class for social media publishers."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = self.__class__.__name__.replace('Publisher', '').lower()
        logger.info(f"Initialized {self.name} publisher")
    
    @abstractmethod
    async def publish_content(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish content to the platform."""
        pass
    
    @abstractmethod
    async def publish_story(self, file_path: Path, caption: Optional[str] = None) -> bool:
        """Publish story/status to the platform."""
        pass
    
    def validate_file(self, file_path: Path, max_size_mb: int = 30) -> bool:
        """Validate file exists and is within size limits."""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        if file_size_mb > max_size_mb:
            logger.error(f"File too large: {file_size_mb:.2f}MB (max {max_size_mb}MB)")
            return False
        
        return True
    
    def get_media_type(self, file_path: Path) -> str:
        """Determine media type from file extension."""
        ext = file_path.suffix.lower()
        image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        video_exts = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
        
        if ext in image_exts:
            return 'image'
        elif ext in video_exts:
            return 'video'
        else:
            return 'unknown'
    
    async def handle_error(self, error: Exception, context: str = "") -> None:
        """Handle and log errors."""
        logger.error(f"Error in {self.name} {context}: {str(error)}")
        raise error
