"""Browser automation modules for social media platforms."""
from .base_browser import BaseBrowserAutomation
from .whatsapp_web import WhatsAppWebAutomation
from .instagram_web import InstagramWebAutomation
from .facebook_web import FacebookWebAutomation
from .telegram_web import TelegramWebAutomation
from .tiktok_web import TikTokWebAutomation

__all__ = [
    'BaseBrowserAutomation',
    'WhatsAppWebAutomation',
    'InstagramWebAutomation',
    'FacebookWebAutomation',
    'TelegramWebAutomation',
    'TikTokWebAutomation',
]