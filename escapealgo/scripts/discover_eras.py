"""
Auto-discover eras for a YouTube channel by analyzing title vocabulary over time.

Strategy:
  1. Fetch ALL video titles + dates via playlistItems.list (cheap: ~1 unit per 50 videos)
  2. Group titles by year
  3. Compute top bigrams/trigrams per year
  4. Measure vocabulary shift year-over-year (Jaccard distance)
  5. Find years where vocabulary shifts significantly → era boundaries
  6. Output a suggested era config ready to paste into channels.json

Usage:
  python scripts/discover_eras.py --channel UC-lHJZR3Gqxm24_Vd_AJ5Yw --name PewDiePie
  python scripts/discover_eras.py --channel UC-lHJZR3Gqxm24_Vd_AJ5Yw --name PewDiePie --eras 5
  python scripts/discover_eras.py --channel UC-lHJZR3Gqxm24_Vd_AJ5Yw --save  # writes to config
"""

import argparse
import json
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from googleapiclient.discovery import build
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent.parent / ".env")

CONFIG_PATH = Path(__file__).parent.parent / "config" / "channels.json"
CACHE_ROOT = Path(__file__).parent.parent / "cache"

# Words that appear everywhere and carry no signal
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "is", "it", "i", "my", "we", "you", "this", "that",
    "was", "are", "be", "have", "has", "do", "did", "not", "no", "so",
    "if", "its", "get", "got", "can", "will", "just", "from", "by",
    "what", "how", "why", "when", "who", "all", "up", "out", "as", "me",
    "new", "more", "one", "part", "ft", "feat", "official", "video",
    "#", "-", "|", "!", "?", ":", "&",
}


def _client():
    key = os.getenv("YOUTUBE_API_KEY")
    if not key:
        raise ValueError("YOUTUBE_API_KEY not set in .env")
    return build("youtube", "v3", developerKey=key)


def get_uploads_playlist_id(channel_id: str) -> str:
    """Get the channel's hidden 'uploads' playlist (free: 1 unit)."""
    yt = _client()
    resp = yt.channels().list(
        part="contentDetails",
        id=channel_id
    ).execute()
    if not resp.get("items"):
        raise ValueError(f"Channel not found: {channel_id}")
    return resp["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]


def fetch_all_video_titles(channel_id: str, max_videos: int = 5000) -> list[dict]:
    """
    Fetch title + publish date for every video on the channel.
    Uses playlistItems.list at 1 unit per page (50 videos/page).
    A 1000-video channel costs ~20 units. Much cheaper than search.list.
    """
    playlist_id = get_uploads_playlist_id(channel_id)
    yt = _client()

    videos = []
    page_token = None
    pages_fetched = 0

    print(f"  Fetching video titles (1 unit per 50 videos)...")

    while len(videos) < max_videos:
        kwargs = dict(
            part="snippet",
            playlistId=playlist_id,
            maxResults=50,
        )
        if page_token:
            kwargs["pageToken"] = page_token

        resp = yt.playlistItems().list(**kwargs).execute()
        pages_fetched += 1

        for item in resp.get("items", []):
            snippet = item["snippet"]
            title = snippet.get("title", "")
            published = snippet.get("publishedAt", "")
            vid_id = snippet.get("resourceId", {}).get("videoId", "")

            if title and published and title != "Private video" and title != "Deleted video":
                videos.append({
                    "video_id": vid_id,
                    "title": title,
                    "published_at": published,
                    "year": int(published[:4]),
                })

        page_token = resp.get("nextPageToken")
        if not page_token:
            break

        if pages_fetched % 10 == 0:
            print(f"    {len(videos)} videos fetched so far...")
            time.sleep(0.1)

    print(f"  ✓ {len(videos)} videos fetched ({pages_fetched} API pages, ~{pages_fetched} quota units)")
    return videos


def tokenize(title: str) -> list[str]:
    title = title.lower()
    title = re.sub(r"[^\w\s]", " ", title)
    tokens = [t for t in title.split() if t not in STOPWORDS and len(t) > 2]
    return tokens


def ngrams(tokens: list[str], n: int) -> list[str]:
    return [" ".join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]


def vocabulary_by_year(videos: list[dict]) -> dict[int, Counter]:
    """Build a Counter of bigrams+trigrams for each year."""
    by_year: dict[int, Counter] = defaultdict(Counter)

    for v in videos:
        tokens = tokenize(v["title"])
        grams = tokens + ngrams(tokens, 2) + ngrams(tokens, 3)
        by_year[v["year"]].update(grams)

    return dict(by_year)


def jaccard_distance(a: Counter, b: Counter) -> float:
    """Vocabulary shift between two years. 0 = identical, 1 = completely different."""
    top_a = set(t for t, c in a.most_common(50))
    top_b = set(t for t, c in b.most_common(50))
    if not top_a and not top_b:
        return 0.0
    intersection = len(top_a & top_b)
    union = len(top_a | top_b)
    return 1.0 - (intersection / union)


def find_era_boundaries(vocab_by_year: dict[int, Counter], n_eras: int) -> list[int]:
    """
    Find the n_eras-1 years with the largest vocabulary shift.
    Returns the boundary years (the year where a new era begins).
    """
    years = sorted(vocab_by_year.keys())
    if len(years) < 2:
        return []

    shifts = {}
    for i in range(1, len(years)):
        y_prev, y_curr = years[i-1], years[i]
        shifts[y_curr] = jaccard_distance(vocab_by_year[y_prev], vocab_by_year[y_curr])

    # Pick the top (n_eras - 1) shift points as boundaries
    boundary_years = sorted(
        shifts, key=shifts.get, reverse=True
    )[:n_eras - 1]

    return sorted(boundary_years)


def build_era_config(
    videos: list[dict],
    vocab_by_year: dict[int, Counter],
    boundaries: list[int],
    channel_id: str,
    creator_name: str,
) -> list[dict]:
    """Build the eras list for channels.json."""
    years = sorted(vocab_by_year.keys())
    year_min, year_max = years[0], years[-1]

    # Split years into groups based on boundaries
    era_year_ranges = []
    prev = year_min
    for b in sorted(boundaries):
        era_year_ranges.append((prev, b - 1))
        prev = b
    era_year_ranges.append((prev, year_max))

    eras = []
    for i, (start, end) in enumerate(era_year_ranges):
        era_videos = [v for v in videos if start <= v["year"] <= end]
        era_vocab = Counter()
        for y in range(start, end + 1):
            era_vocab.update(vocab_by_year.get(y, Counter()))

        top_keywords = [t for t, _ in era_vocab.most_common(20) if " " not in t][:6]
        top_phrases = [t for t, _ in era_vocab.most_common(30) if " " in t][:4]

        end_label = str(end) if end < 2090 else "Now"

        eras.append({
            "slug": f"era-{start}-{end_label.lower()}",
            "label": f"Era {i+1} ({start}–{end_label})",
            "years": f"{start} - {end_label}",
            "year_start": start,
            "year_end": end,
            "description": f"Auto-detected era. Top themes: {', '.join(top_phrases[:3] or top_keywords[:3])}.",
            "search_keywords": top_phrases[:2] + top_keywords[:2],
            "_stats": {
                "video_count": len(era_videos),
                "top_unigrams": top_keywords,
                "top_phrases": top_phrases,
            }
        })

    return eras


def print_era_report(eras: list[dict], vocab_by_year: dict[int, Counter]) -> None:
    print("\n" + "="*60)
    print("  DETECTED ERAS")
    print("="*60)
    for era in eras:
        stats = era.get("_stats", {})
        print(f"\n  {era['years']}  —  {stats.get('video_count', 0)} videos")
        print(f"  Top phrases : {', '.join(stats.get('top_phrases', [])[:5])}")
        print(f"  Top words   : {', '.join(stats.get('top_unigrams', [])[:6])}")
        print(f"  Keywords    : {era['search_keywords']}")


def cache_titles(channel_id: str, videos: list[dict]) -> None:
    path = CACHE_ROOT / channel_id / "all_titles.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(videos, indent=2))


def load_cached_titles(channel_id: str) -> list[dict] | None:
    path = CACHE_ROOT / channel_id / "all_titles.json"
    if path.exists():
        age_hours = (time.time() - path.stat().st_mtime) / 3600
        if age_hours < 72:
            print(f"  Using cached titles ({int(age_hours)}h old) — skip API call with --use-cache")
            return json.loads(path.read_text())
    return None


def save_to_config(creator_id: str, eras: list[dict]) -> None:
    config = json.loads(CONFIG_PATH.read_text())
    # Strip internal _stats before saving
    clean_eras = [{k: v for k, v in e.items() if k != "_stats"} for e in eras]

    for creator in config["creators"]:
        if creator["id"] == creator_id:
            creator["eras"] = clean_eras
            CONFIG_PATH.write_text(json.dumps(config, indent=2))
            print(f"\n  ✓ Saved to config/channels.json under '{creator_id}'")
            return

    print(f"\n  Creator '{creator_id}' not found in config — add it manually.")


def main():
    parser = argparse.ArgumentParser(description="Auto-discover eras for a YouTube channel")
    parser.add_argument("--channel", required=True, help="YouTube channel ID")
    parser.add_argument("--name", required=True, help="Creator display name")
    parser.add_argument("--creator-id", help="ID in channels.json (e.g. 'pewdiepie'). Defaults to lowercased name.")
    parser.add_argument("--eras", type=int, default=5, help="Number of eras to detect (default: 5)")
    parser.add_argument("--max-videos", type=int, default=5000, help="Max videos to analyze")
    parser.add_argument("--use-cache", action="store_true", help="Use cached titles if available")
    parser.add_argument("--save", action="store_true", help="Write detected eras to channels.json")
    args = parser.parse_args()

    creator_id = args.creator_id or args.name.lower().replace(" ", "")

    print(f"\nAnalyzing: {args.name} ({args.channel})")

    # Fetch or load titles
    videos = None
    if args.use_cache:
        videos = load_cached_titles(args.channel)

    if not videos:
        videos = fetch_all_video_titles(args.channel, max_videos=args.max_videos)
        cache_titles(args.channel, videos)

    if not videos:
        print("No videos found.")
        sys.exit(1)

    years = sorted(set(v["year"] for v in videos))
    print(f"  Years spanned: {years[0]} – {years[-1]}  ({len(years)} years, {len(videos)} videos)")

    # Analyze
    vocab_by_year = vocabulary_by_year(videos)
    boundaries = find_era_boundaries(vocab_by_year, n_eras=args.eras)
    eras = build_era_config(videos, vocab_by_year, boundaries, args.channel, args.name)

    print_era_report(eras, vocab_by_year)

    # Output JSON
    print("\n" + "="*60)
    print("  ERA CONFIG (paste into channels.json):")
    print("="*60)
    clean = [{k: v for k, v in e.items() if k != "_stats"} for e in eras]
    print(json.dumps(clean, indent=2))

    if args.save:
        save_to_config(creator_id, eras)


if __name__ == "__main__":
    main()
