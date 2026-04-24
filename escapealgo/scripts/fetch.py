"""
Main entry point for fetching and caching YouTube creator data.

Usage:
  # Fetch all creators defined in config/channels.json
  python scripts/fetch.py

  # Fetch a specific creator
  python scripts/fetch.py --creator pewdiepie

  # Fetch a specific creator + era
  python scripts/fetch.py --creator pewdiepie --era early-lets-plays

  # Skip clip downloads (faster, thumbnails only)
  python scripts/fetch.py --no-clips

  # Force re-fetch even if cache is fresh
  python scripts/fetch.py --force

  # After fetching, regenerate manifest.json for the frontend
  python scripts/fetch.py --manifest-only
"""

import argparse
import json
import sys
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent))

import cache
import youtube_api
import clip_downloader
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

CONFIG_PATH = Path(__file__).parent.parent / "config" / "channels.json"


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text())


def fetch_creator(creator: dict, skip_clips: bool, force: bool) -> None:
    cid = creator["id"]
    channel_id = creator["channel_id"]
    print(f"\n{'='*60}")
    print(f"  {creator['display_name']}  ({channel_id})")
    print(f"{'='*60}")

    # ── Channel metadata ──────────────────────────────────────────
    if force or not cache.channel_meta_is_fresh(cid):
        print("  Fetching channel metadata...")
        try:
            meta = youtube_api.fetch_channel_info(channel_id)
            meta.update({
                "id": cid,
                "display_name": creator["display_name"],
                "tagline": creator.get("tagline", ""),
            })
            cache.write_channel_meta(cid, meta)
            print(f"  ✓ {meta['title']} — {meta['subscriber_count']:,} subscribers")
        except Exception as e:
            print(f"  ✗ Channel fetch failed: {e}")
            return
    else:
        print("  Channel metadata fresh, skipping.")

    # ── Eras ──────────────────────────────────────────────────────
    max_videos = int(__import__("os").getenv("MAX_VIDEOS_PER_ERA", "10"))

    for era in creator["eras"]:
        era_slug = era["slug"]
        print(f"\n  Era: {era['label']} ({era['years']})")

        # Videos list
        if force or not cache.era_videos_are_fresh(cid, era_slug):
            print(f"    Searching videos...")
            try:
                videos = youtube_api.fetch_era_videos(
                    channel_id=channel_id,
                    year_start=era["year_start"],
                    year_end=era["year_end"],
                    keywords=era.get("search_keywords"),
                    max_results=max_videos,
                )
                cache.write_era_videos(cid, era_slug, videos)
                print(f"    ✓ {len(videos)} videos cached")
            except Exception as e:
                print(f"    ✗ Video search failed: {e}")
                videos = cache.read_era_videos(cid, era_slug) or []
        else:
            videos = cache.read_era_videos(cid, era_slug) or []
            print(f"    Videos fresh ({len(videos)} cached), skipping search.")

        # Thumbnails
        thumb_dir = cache.ensure_thumbnail_dir(cid, era_slug)
        for v in videos:
            vid = v["video_id"]
            if cache.thumbnail_exists(cid, era_slug, vid):
                continue
            dest = cache.thumbnail_path(cid, era_slug, vid)
            ok = youtube_api.download_thumbnail(v["thumbnail_url"], dest)
            status = "✓" if ok else "✗"
            print(f"    {status} thumbnail: {v['title'][:50]}")

        # Clips
        if skip_clips:
            print("    Clips skipped (--no-clips)")
            continue

        if not clip_downloader.ytdlp_available():
            print("    Clips skipped (yt-dlp not installed)")
            continue

        if not clip_downloader.ffmpeg_available():
            print("    Clips skipped (ffmpeg not installed — brew install ffmpeg)")
            continue

        clip_dir = cache.ensure_clip_dir(cid, era_slug)
        # Only download clips for the top 3 videos per era to save space/quota
        for v in videos[:3]:
            vid = v["video_id"]
            if cache.clip_exists(cid, era_slug, vid):
                continue
            dest = cache.clip_path(cid, era_slug, vid)
            print(f"    Downloading clip: {v['title'][:50]}...")
            ok = clip_downloader.download_clip(vid, dest)
            status = "✓" if ok else "✗"
            print(f"    {status} clip: {vid}")


def main():
    parser = argparse.ArgumentParser(description="Fetch and cache YouTube creator data")
    parser.add_argument("--creator", help="Only fetch this creator id (e.g. pewdiepie)")
    parser.add_argument("--era", help="Only fetch this era slug (requires --creator)")
    parser.add_argument("--no-clips", action="store_true", help="Skip video clip downloads")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cache is fresh")
    parser.add_argument("--manifest-only", action="store_true", help="Just regenerate manifest.json")
    args = parser.parse_args()

    if args.manifest_only:
        path = cache.write_manifest()
        print(f"Done — {path}")
        return

    config = load_config()
    creators = config["creators"]

    if args.creator:
        creators = [c for c in creators if c["id"] == args.creator]
        if not creators:
            print(f"Creator '{args.creator}' not found in config/channels.json")
            sys.exit(1)

    if args.era:
        if not args.creator:
            print("--era requires --creator")
            sys.exit(1)
        for c in creators:
            c["eras"] = [e for e in c["eras"] if e["slug"] == args.era]

    for creator in creators:
        fetch_creator(creator, skip_clips=args.no_clips, force=args.force)

    print("\nWriting manifest.json...")
    cache.write_manifest()
    print("Done.")


if __name__ == "__main__":
    main()
