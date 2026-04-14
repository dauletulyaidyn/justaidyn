"""Command parser for social media publishing commands."""
import re
from typing import List, Dict, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class CommandParser:
    """Parser for natural language publishing commands."""
    
    # Platform keywords and their mappings
    PLATFORM_KEYWORDS = {
        'тикток': 'tiktok',
        'tiktok': 'tiktok',
        'тик-ток': 'tiktok',
        
        'whatsapp канал': 'whatsapp_channel',
        'whatsapp channel': 'whatsapp_channel',
        'ватсап канал': 'whatsapp_channel',
        'ватсап канале': 'whatsapp_channel',
        
        'whatsapp сообщество': 'whatsapp_community',
        'whatsapp community': 'whatsapp_community',
        'ватсап сообщество': 'whatsapp_community',
        'ватсап комьюнити': 'whatsapp_community',
        
        'whatsapp статус': 'whatsapp_status',
        'whatsapp status': 'whatsapp_status',
        'ватсап статус': 'whatsapp_status',
        'ватсап сторис': 'whatsapp_status',
        
        'youtube': 'youtube',
        'ютуб': 'youtube',
        'shorts': 'youtube',
        'шортс': 'youtube',
        
        'telegram канал': 'telegram_channel',
        'telegram channel': 'telegram_channel',
        'телеграм канал': 'telegram_channel',
        'тг канал': 'telegram_channel',
        
        'telegram': 'telegram_channel',
        'телеграм': 'telegram_channel',
        'тг': 'telegram_channel',
        
        'telegram статус': 'telegram_status',
        'телеграм статус': 'telegram_status',
        
        'instagram': 'instagram_content',
        'инстаграм': 'instagram_content',
        'инста': 'instagram_content',
        'ig': 'instagram_content',
        
        'instagram статус': 'instagram_status',
        'инстаграм статус': 'instagram_status',
        'инста сторис': 'instagram_status',
        'instagram stories': 'instagram_status',
        'сторис': 'instagram_status',
        
        'threads': 'threads',
        'тредс': 'threads',
        
        'facebook': 'facebook_content',
        'фейсбук': 'facebook_content',
        'фб': 'facebook_content',
        'fb': 'facebook_content',
        
        'facebook reels': 'facebook_reels',
        'фейсбук рилс': 'facebook_reels',
        'fb reels': 'facebook_reels',
        'фб рилс': 'facebook_reels',
        
        'facebook статус': 'facebook_status',
        'фейсбук статус': 'facebook_status',
        'fb статус': 'facebook_status',
        'facebook stories': 'facebook_status',
    }
    
    def __init__(self, banners_path: Path):
        self.banners_path = Path(banners_path)
    
    def parse(self, command: str) -> Dict[str, any]:
        """
        Parse a publishing command.
        
        Returns dict with:
        - file_path: Path to the file to publish
        - platforms: List of platforms to publish to
        - caption: Optional caption/text
        - errors: List of errors if any
        """
        result = {
            'file_path': None,
            'platforms': [],
            'caption': None,
            'errors': []
        }
        
        # Extract filename
        file_path = self._extract_filename(command)
        if file_path:
            result['file_path'] = file_path
        else:
            result['errors'].append("No valid file found in command")
        
        # Extract platforms
        platforms = self._extract_platforms(command)
        result['platforms'] = platforms
        if not platforms:
            result['errors'].append("No platforms specified")
        
        # Extract caption (optional text after "с текстом" or "с подписью")
        caption = self._extract_caption(command)
        if caption:
            result['caption'] = caption
        
        return result
    
    def _extract_filename(self, command: str) -> Optional[Path]:
        """Extract filename from command."""
        # Look for patterns like "баннер 01_slogan_ru.png" or just "01_slogan_ru.png"
        patterns = [
            r'баннер\s+(\S+\.png|\S+\.jpg|\S+\.jpeg|\S+\.mp4)',
            r'файл\s+(\S+\.png|\S+\.jpg|\S+\.jpeg|\S+\.mp4)',
            r'(\S+\.png|\S+\.jpg|\S+\.jpeg|\S+\.mp4)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, command, re.IGNORECASE)
            if match:
                filename = match.group(1)
                file_path = self.banners_path / filename
                if file_path.exists():
                    return file_path
                # Try without extension
                for ext in ['.png', '.jpg', '.jpeg', '.mp4']:
                    file_path = self.banners_path / (filename + ext)
                    if file_path.exists():
                        return file_path
        
        return None
    
    def _extract_platforms(self, command: str) -> List[str]:
        """Extract platforms from command."""
        platforms = []
        command_lower = command.lower()
        
        # Check for "все" or "всюду" (publish to all)
        if any(word in command_lower for word in ['все', 'всюду', 'everywhere', 'all platforms']):
            return [
                'tiktok',
                'whatsapp_channel',
                'whatsapp_community',
                'whatsapp_status',
                'youtube',
                'telegram_channel',
                'telegram_status',
                'instagram_content',
                'instagram_status',
                'threads',
                'facebook_content',
                'facebook_reels',
                'facebook_status',
            ]
        
        # Check for each platform keyword
        for keyword, platform in self.PLATFORM_KEYWORDS.items():
            if keyword in command_lower:
                if platform not in platforms:
                    platforms.append(platform)
        
        # Special handling for context
        if 'в instagram и telegram' in command_lower or 'в инстаграм и телеграм' in command_lower:
            if 'instagram_content' not in platforms:
                platforms.append('instagram_content')
            if 'telegram_channel' not in platforms:
                platforms.append('telegram_channel')
        
        return platforms
    
    def _extract_caption(self, command: str) -> Optional[str]:
        """Extract caption from command."""
        # Look for patterns like "с текстом '...'" or "с подписью '...'"
        patterns = [
            r'с текстом ["\'](.+?)["\']',
            r'с подписью ["\'](.+?)["\']',
            r'с описанием ["\'](.+?)["\']',
            r'caption ["\'](.+?)["\']',
            r'text ["\'](.+?)["\']',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, command, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def get_available_files(self) -> List[str]:
        """Get list of available banner files."""
        if not self.banners_path.exists():
            return []
        
        files = []
        for ext in ['*.png', '*.jpg', '*.jpeg', '*.mp4']:
            files.extend([f.name for f in self.banners_path.glob(ext)])
        
        return sorted(files)
    
    def format_help(self) -> str:
        """Return help text for command format."""
        available_files = self.get_available_files()
        files_sample = available_files[:5] if available_files else ['01_slogan_ru.png']
        
        help_text = f"""
📱 Формат команд для публикации:

"Опубликуй [файл] в [платформы]"

Примеры:
- "Опубликуй баннер 01_slogan_ru.png в Instagram и Telegram"
- "Опубликуй 02_ai_ne_chat_ru.png в TikTok, YouTube Shorts и Instagram Reels"
- "Опубликуй 03_bez_magii_kk.png везде"
- "Опубликуй файл во все соцсети с текстом 'Мой новый пост'"

Доступные файлы ({len(available_files)}):
{', '.join(files_sample)}{'...' if len(available_files) > 5 else ''}

Доступные платформы:
• TikTok (тикток)
• WhatsApp Channel (ватсап канал)
• WhatsApp Community (ватсап сообщество)  
• WhatsApp Status (ватсап статус)
• YouTube Shorts (ютуб, шортс)
• Telegram Channel (телеграм канал)
• Telegram Status (телеграм статус)
• Instagram (инстаграм)
• Instagram Stories (инстаграм статус/сторис)
• Threads (тредс)
• Facebook (фейсбук)
• Facebook Reels (фейсбук рилс)
• Facebook Status (фейсбук статус)
"""
        return help_text
