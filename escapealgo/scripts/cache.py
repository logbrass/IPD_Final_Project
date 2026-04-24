"""
Cache manager — reads/writes structured JSON metadata and tracks downloaded assets.

Cache layout:
  cache/
    {creator_id}/
      metadata.json          ← channel-level info + last_fetched timestamp
      {era_slug}/
        videos.json          ← list of video records for this era
        thumbnails/
          {video_id}.jpg
        clips/
          {video_id}.mp4
"""

import json
import os
import time
from pathlib import Path
from typing import Optional

CACHE_ROOT = Path(__file__).parent.parent / "cache"


def _creator_dir(creator_id: str) -> Path:
    return CACHE_ROOT / creator_id


def _era_dir(creator_id: str, era_slug: str) -> Path:
    return _creator_dir(creator_id) / era_slug


def _ensure(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


# ── Channel metadata ──────────────────────────────────────────────────────────

def read_channel_meta(creator_id: str) -> Optional[dict]:
    path = _creator_dir(creator_id) / "metadata.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def write_channel_meta(creator_id: str, data: dict) -> None:
    _ensure(_creator_dir(creator_id))
    data["last_fetched"] = time.time()
    path = _creator_dir(creator_id) / "metadata.json"
    path.write_text(json.dumps(data, indent=2))


def channel_meta_is_fresh(creator_id: str, max_age_hours: float = 24) -> bool:
    meta = read_channel_meta(creator_id)
    if not meta or "last_fetched" not in meta:
        return False
    age = time.time() - meta["last_fetched"]
    return age < max_age_hours * 3600


# ── Era video lists ───────────────────────────────────────────────────────────

def read_era_videos(creator_id: str, era_slug: str) -> Optional[list]:
    path = _era_dir(creator_id, era_slug) / "videos.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def write_era_videos(creator_id: str, era_slug: str, videos: list) -> None:
    d = _ensure(_era_dir(creator_id, era_slug))
    path = d / "videos.json"
    path.write_text(json.dumps(videos, indent=2))


def era_videos_are_fresh(creator_id: str, era_slug: str, max_age_hours: float = 48) -> bool:
    path = _era_dir(creator_id, era_slug) / "videos.json"
    if not path.exists():
        return False
    age = time.time() - path.stat().st_mtime
    return age < max_age_hours * 3600


# ── Thumbnails ────────────────────────────────────────────────────────────────

def thumbnail_path(creator_id: str, era_slug: str, video_id: str) -> Path:
    return _era_dir(creator_id, era_slug) / "thumbnails" / f"{video_id}.jpg"


def thumbnail_exists(creator_id: str, era_slug: str, video_id: str) -> bool:
    return thumbnail_path(creator_id, era_slug, video_id).exists()


def ensure_thumbnail_dir(creator_id: str, era_slug: str) -> Path:
    return _ensure(_era_dir(creator_id, era_slug) / "thumbnails")


# ── Clips ─────────────────────────────────────────────────────────────────────

def clip_path(creator_id: str, era_slug: str, video_id: str) -> Path:
    return _era_dir(creator_id, era_slug) / "clips" / f"{video_id}.mp4"


def clip_exists(creator_id: str, era_slug: str, video_id: str) -> bool:
    return clip_path(creator_id, era_slug, video_id).exists()


def ensure_clip_dir(creator_id: str, era_slug: str) -> Path:
    return _ensure(_era_dir(creator_id, era_slug) / "clips")


# ── Full cache export (for the website) ──────────────────────────────────────

def build_manifest() -> dict:
    """
    Walk the entire cache and build a single manifest.json that the frontend
    can consume to know what assets are available.
    """
    manifest = {}

    if not CACHE_ROOT.exists():
        return manifest

    for creator_dir in sorted(CACHE_ROOT.iterdir()):
        if not creator_dir.is_dir():
            continue
        creator_id = creator_dir.name
        meta = read_channel_meta(creator_id) or {}
        manifest[creator_id] = {
            "channel": meta,
            "eras": {}
        }

        for era_dir in sorted(creator_dir.iterdir()):
            if not era_dir.is_dir():
                continue
            era_slug = era_dir.name
            videos = read_era_videos(creator_id, era_slug) or []

            thumbnails = [
                p.name.replace(".jpg", "")
                for p in (era_dir / "thumbnails").glob("*.jpg")
            ] if (era_dir / "thumbnails").exists() else []

            clips = [
                p.name.replace(".mp4", "")
                for p in (era_dir / "clips").glob("*.mp4")
            ] if (era_dir / "clips").exists() else []

            manifest[creator_id]["eras"][era_slug] = {
                "videos": videos,
                "cached_thumbnails": thumbnails,
                "cached_clips": clips,
            }

    return manifest


def write_manifest() -> Path:
    manifest = build_manifest()
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    path = CACHE_ROOT / "manifest.json"
    path.write_text(json.dumps(manifest, indent=2))
    print(f"Manifest written → {path}")
    return path
