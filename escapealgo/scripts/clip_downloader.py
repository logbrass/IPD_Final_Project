"""
Video clip downloader using yt-dlp.
Downloads the first N seconds of a YouTube video as an mp4.
Requires ffmpeg to be installed (brew install ffmpeg).
"""

import os
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

CLIP_DURATION = int(os.getenv("CLIP_DURATION_SECONDS", "30"))


def download_clip(video_id: str, dest_path: Path, duration_seconds: int = CLIP_DURATION) -> bool:
    """
    Download the first `duration_seconds` of a YouTube video.
    Uses yt-dlp + ffmpeg to trim without downloading the full file.
    Returns True on success.
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # yt-dlp's --download-sections lets us grab just a time range
    # without pulling the entire video file first.
    cmd = [
        "yt-dlp",
        "--quiet",
        "--no-warnings",
        "--format", "bestvideo[ext=mp4][height<=480]+bestaudio[ext=m4a]/best[ext=mp4][height<=480]/best",
        "--download-sections", f"*0-{duration_seconds}",
        "--force-keyframes-at-cuts",
        "--merge-output-format", "mp4",
        "--output", str(dest_path),
        url,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  yt-dlp error for {video_id}: {result.stderr.strip()[:200]}")
            return False
        return dest_path.exists()
    except subprocess.TimeoutExpired:
        print(f"  Clip download timed out for {video_id}")
        return False
    except FileNotFoundError:
        print("  yt-dlp not found — run: pip install yt-dlp")
        return False


def ffmpeg_available() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def ytdlp_available() -> bool:
    try:
        subprocess.run(["yt-dlp", "--version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False
