"""Configuration module for social media publisher."""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Base paths
BASE_DIR = Path(__file__).parent.parent
BANNERS_PATH = Path(os.getenv('BANNERS_PATH', '../'))

# Telegram Config
TELEGRAM_CONFIG = {
    'bot_token': os.getenv('TELEGRAM_BOT_TOKEN'),
    'channel_id': os.getenv('TELEGRAM_CHANNEL_ID'),
    'user_id': os.getenv('TELEGRAM_USER_ID'),
}

# Meta Config (Instagram, Facebook, Threads)
META_CONFIG = {
    'app_id': os.getenv('META_APP_ID'),
    'app_secret': os.getenv('META_APP_SECRET'),
    'access_token': os.getenv('META_ACCESS_TOKEN'),
    'instagram_account_id': os.getenv('INSTAGRAM_ACCOUNT_ID'),
    'facebook_page_id': os.getenv('FACEBOOK_PAGE_ID'),
}

# YouTube Config
YOUTUBE_CONFIG = {
    'client_id': os.getenv('YOUTUBE_CLIENT_ID'),
    'client_secret': os.getenv('YOUTUBE_CLIENT_SECRET'),
    'refresh_token': os.getenv('YOUTUBE_REFRESH_TOKEN'),
    'channel_id': os.getenv('YOUTUBE_CHANNEL_ID'),
}

# TikTok Config
TIKTOK_CONFIG = {
    'access_token': os.getenv('TIKTOK_ACCESS_TOKEN'),
    'open_id': os.getenv('TIKTOK_OPEN_ID'),
}

# WhatsApp Config
WHATSAPP_CONFIG = {
    'access_token': os.getenv('WHATSAPP_ACCESS_TOKEN'),
    'phone_number_id': os.getenv('WHATSAPP_PHONE_NUMBER_ID'),
    'channel_id': os.getenv('WHATSAPP_CHANNEL_ID'),
    'community_id': os.getenv('WHATSAPP_COMMUNITY_ID'),
}

# Browser Automation Config
BROWSER_CONFIG = {
    'use_automation': os.getenv('USE_BROWSER_AUTOMATION', 'false').lower() == 'true',
    'headless': os.getenv('BROWSER_HEADLESS', 'false').lower() == 'true',
}

INSTAGRAM_WEB_CONFIG = {
    'username': os.getenv('INSTAGRAM_USERNAME'),
    'password': os.getenv('INSTAGRAM_PASSWORD'),
}

FACEBOOK_WEB_CONFIG = {
    'email': os.getenv('FACEBOOK_EMAIL'),
    'password': os.getenv('FACEBOOK_PASSWORD'),
}

TIKTOK_WEB_CONFIG = {
    'email': os.getenv('TIKTOK_EMAIL'),
    'password': os.getenv('TIKTOK_PASSWORD'),
}

TELEGRAM_WEB_CONFIG = {
    'phone': os.getenv('TELEGRAM_PHONE'),
}

# Platform settings
PLATFORM_SETTINGS = {
    'instagram': {
        'content': {'aspect_ratio': '1:1', 'max_size_mb': 30},
        'story': {'aspect_ratio': '9:16', 'max_size_mb': 30},
    },
    'facebook': {
        'content': {'aspect_ratio': 'any', 'max_size_mb': 50},
        'reels': {'aspect_ratio': '9:16', 'max_size_mb': 100},
        'story': {'aspect_ratio': '9:16', 'max_size_mb': 30},
    },
    'youtube': {
        'shorts': {'aspect_ratio': '9:16', 'max_duration_sec': 60},
    },
    'tiktok': {
        'content': {'aspect_ratio': '9:16', 'max_duration_sec': 180},
    },
    'telegram': {
        'content': {'max_size_mb': 20},
        'story': {'max_size_mb': 10},
    },
    'threads': {
        'content': {'aspect_ratio': '1:1', 'max_size_mb': 30},
    },
    'whatsapp': {
        'content': {'max_size_mb': 16},
        'status': {'max_size_mb': 5},
    },
}

# Supported platforms
SUPPORTED_PLATFORMS = [
    'tiktok',
    'whatsapp_channel',
    'whatsapp_community',
    'whatsapp_status',
    'youtube',
    'telegram',
    'telegram_channel',
    'telegram_status',
    'instagram',
    'instagram_content',
    'instagram_status',
    'threads',
    'facebook',
    'facebook_content',
    'facebook_reels',
    'facebook_status',
]

# Platform aliases
PLATFORM_ALIASES = {
    'instagram': ['instagram_content'],
    'telegram': ['telegram_channel'],
    'facebook': ['facebook_content'],
    'whatsapp': ['whatsapp_channel'],
}

def get_config(platform):
    """Get configuration for a specific platform."""
    configs = {
        'telegram': TELEGRAM_CONFIG,
        'meta': META_CONFIG,
        'youtube': YOUTUBE_CONFIG,
        'tiktok': TIKTOK_CONFIG,
        'whatsapp': WHATSAPP_CONFIG,
    }
    return configs.get(platform, {})
