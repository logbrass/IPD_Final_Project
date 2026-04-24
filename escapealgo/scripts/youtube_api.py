"""
YouTube Data API v3 wrapper.
Handles channel info, searching videos by era date range, and thumbnail downloads.

Quota cost notes (free tier = 10,000 units/day):
  - search.list:   100 units
  - videos.list:     1 unit
  - channels.list:   1 unit
  Typical full fetch for one creator (~5 eras, 10 videos each) ≈ 510 units.
"""

import os
import time
import requests
from pathlib import Path
from datetime import datetime, timezone
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.getenv("YOUTUBE_API_KEY")


def _client():
    if not API_KEY:
        raise ValueError("YOUTUBE_API_KEY not set in .env")
    return build("youtube", "v3", developerKey=API_KEY)


def fetch_channel_info(channel_id: str) -> dict:
    """Return basic channel metadata (name, description, thumbnail, sub count)."""
    yt = _client()
    resp = yt.channels().list(
        part="snippet,statistics",
        id=channel_id
    ).execute()

    if not resp.get("items"):
        raise ValueError(f"Channel not found: {channel_id}")

    item = resp["items"][0]
    snippet = item["snippet"]
    stats = item.get("statistics", {})

    return {
        "channel_id": channel_id,
        "title": snippet["title"],
        "description": snippet.get("description", ""),
        "subscriber_count": int(stats.get("subscriberCount", 0)),
        "video_count": int(stats.get("videoCount", 0)),
        "avatar_url": snippet["thumbnails"].get("high", {}).get("url", ""),
    }


def fetch_era_videos(
    channel_id: str,
    year_start: int,
    year_end: int,
    keywords: list[str] | None = None,
    max_results: int = 10,
) -> list[dict]:
    """
    Search a channel for videos published within [year_start, year_end].
    Optionally filter by keywords (runs one search per keyword, deduplicates).
    Returns list of video dicts with title, view count, thumbnail URLs, etc.
    """
    yt = _client()

    published_after = f"{year_start}-01-01T00:00:00Z"
    # Cap year_end at current year so future-dated eras don't break
    actual_end = min(year_end, datetime.now(timezone.utc).year)
    published_before = f"{actual_end}-12-31T23:59:59Z"

    search_terms = keywords if keywords else [None]
    seen_ids: set[str] = set()
    video_ids: list[str] = []

    for term in search_terms:
        if len(video_ids) >= max_results:
            break
        kwargs = dict(
            part="id",
            channelId=channel_id,
            type="video",
            order="viewCount",
            publishedAfter=published_after,
            publishedBefore=published_before,
            maxResults=min(max_results, 25),
        )
        if term:
            kwargs["q"] = term

        resp = yt.search().list(**kwargs).execute()
        for item in resp.get("items", []):
            vid = item["id"]["videoId"]
            if vid not in seen_ids:
                seen_ids.add(vid)
                video_ids.append(vid)

        time.sleep(0.2)  # gentle rate limiting

    if not video_ids:
        return []

    # Batch fetch full video details (title, views, duration, best thumbnail)
    vid_resp = yt.videos().list(
        part="snippet,statistics,contentDetails",
        id=",".join(video_ids[:max_results])
    ).execute()

    results = []
    for item in vid_resp.get("items", []):
        snippet = item["snippet"]
        stats = item.get("statistics", {})
        thumbs = snippet.get("thumbnails", {})
        best_thumb = (
            thumbs.get("maxres") or
            thumbs.get("standard") or
            thumbs.get("high") or
            thumbs.get("medium") or
            thumbs.get("default") or {}
        )

        results.append({
            "video_id": item["id"],
            "title": snippet["title"],
            "published_at": snippet["publishedAt"],
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "duration": item["contentDetails"]["duration"],  # ISO 8601 e.g. PT8M42S
            "thumbnail_url": best_thumb.get("url", ""),
            "thumbnail_width": best_thumb.get("width"),
            "thumbnail_height": best_thumb.get("height"),
            "watch_url": f"https://www.youtube.com/watch?v={item['id']}",
        })

    results.sort(key=lambda v: v["view_count"], reverse=True)
    return results


def download_thumbnail(url: str, dest_path: Path) -> bool:
    """Download a single thumbnail image. Returns True on success."""
    if not url:
        return False
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(resp.content)
        return True
    except Exception as e:
        print(f"  Thumbnail download failed ({url}): {e}")
        return False
