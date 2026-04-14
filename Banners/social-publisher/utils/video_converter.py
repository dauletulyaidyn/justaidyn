"""Convert images to video for TikTok and YouTube Shorts."""
import subprocess
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class VideoConverter:
    """Convert PNG/JPG images to video format."""
    
    @staticmethod
    def image_to_video(image_path: Path, output_path: Path, duration: int = 5) -> bool:
        """
        Convert image to video using ffmpeg.
        
        Args:
            image_path: Path to image file
            output_path: Path for output video
            duration: Video duration in seconds
        
        Returns:
            bool: True if successful
        """
        try:
            # Use ffmpeg to create video from image
            cmd = [
                'ffmpeg',
                '-loop', '1',
                '-i', str(image_path),
                '-c:v', 'libx264',
                '-t', str(duration),
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
                '-y',  # Overwrite output
                str(output_path)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info(f"Video created: {output_path}")
                return True
            else:
                logger.error(f"FFmpeg error: {result.stderr}")
                return False
                
        except FileNotFoundError:
            logger.error("FFmpeg not found. Please install ffmpeg first.")
            logger.info("Download: https://ffmpeg.org/download.html")
            return False
        except Exception as e:
            logger.error(f"Error converting to video: {e}")
            return False
    
    @staticmethod
    def create_tiktok_video(image_path: Path) -> Path:
        """Create TikTok format video (9:16)."""
        output = image_path.parent / f"{image_path.stem}_tiktok.mp4"
        if VideoConverter.image_to_video(image_path, output, duration=5):
            return output
        return None
    
    @staticmethod
    def create_youtube_shorts(image_path: Path) -> Path:
        """Create YouTube Shorts format video (9:16)."""
        output = image_path.parent / f"{image_path.stem}_shorts.mp4"
        if VideoConverter.image_to_video(image_path, output, duration=5):
            return output
        return None


if __name__ == '__main__':
    # Test conversion
    converter = VideoConverter()
    banner = Path("../00_first.png")
    
    if banner.exists():
        print(f"Converting {banner.name}...")
        video = converter.create_tiktok_video(banner)
        if video:
            print(f"✅ Created: {video}")
        else:
            print("❌ Failed")
    else:
        print("Banner not found")
