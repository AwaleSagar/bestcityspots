#!/usr/bin/env python3
"""
test-keys.py — quick health check for every external key/service bestcityspots uses.

Runs a *minimal* live request against each provider and reports pass/fail with the
real status code + error message, so you can tell at a glance whether a key is
missing, invalid, or the underlying API simply isn't enabled (the classic
"Places API (New) not enabled" / billing case).

What it checks:
  • Database  — Supabase REST (anon read of public.cities) + service-role read
  • Places    — Google Places API (New) places:searchText
  • Weather   — OpenWeatherMap current weather
  • AI        — OpenAI and/or Google Gemini model list (cheap, no token spend)

Usage:
    python scripts/test-keys.py

Notes:
  • Standard library only — no pip install required.
  • Reads variables from the shell first, then fills gaps from .env.local / .env.
  • Never prints full secrets (keys are masked).
  • Exit code is non-zero if any *configured* check fails (CI-friendly).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TIMEOUT = 15

# ── ANSI helpers (degrade gracefully if not a TTY) ───────────────────────────
_TTY = sys.stdout.isatty()


def c(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _TTY else text


OK = c("32", "✓")
BAD = c("31", "✗")
SKIP = c("33", "–")


def mask(value: str | None) -> str:
    if not value:
        return "(unset)"
    if len(value) <= 10:
        return value[0] + "…" + value[-1]
    return f"{value[:6]}…{value[-4:]} (len {len(value)})"


# ── env loading: shell first, then .env.local / .env ─────────────────────────
def load_env_files() -> None:
    for name in (".env.local", ".env"):
        path = REPO_ROOT / name
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            # Shell-provided values win; .env.local fills only what's missing.
            if key and key not in os.environ:
                os.environ[key] = val


def env(key: str) -> str | None:
    val = os.environ.get(key)
    return val.strip() if isinstance(val, str) and val.strip() else None


# ── HTTP helper: returns (status, body_text, error_text) ─────────────────────
def http(method: str, url: str, headers: dict | None = None, body: bytes | None = None):
    req = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), None
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace") if e.fp else ""
        return e.code, detail, f"HTTP {e.code} {e.reason}"
    except urllib.error.URLError as e:
        return None, "", f"network error: {e.reason}"
    except Exception as e:  # noqa: BLE001
        return None, "", f"error: {e}"


def short(text: str, limit: int = 240) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit] + "…"


results: list[tuple[str, bool | None]] = []


def report(name: str, ok: bool | None, detail: str) -> None:
    icon = OK if ok else (SKIP if ok is None else BAD)
    print(f"  {icon} {name}: {detail}")
    results.append((name, ok))


# ── checks ───────────────────────────────────────────────────────────────────
def check_database() -> None:
    print(c("1", "── Database (Supabase) ──"))
    url = env("NEXT_PUBLIC_SUPABASE_URL")
    anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    svc = env("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not anon:
        report("supabase anon read", None, "skipped — NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not set")
        return

    endpoint = f"{url.rstrip('/')}/rest/v1/cities?select=id&limit=1"
    status, body, err = http(
        "GET", endpoint, {"apikey": anon, "Authorization": f"Bearer {anon}"}
    )
    if status == 200:
        try:
            rows = json.loads(body)
            n = len(rows) if isinstance(rows, list) else "?"
        except json.JSONDecodeError:
            n = "?"
        report("supabase anon read (cities)", True, f"200 OK, returned {n} row(s) [key {mask(anon)}]")
    else:
        report("supabase anon read (cities)", False, f"{err or status}: {short(body)}")

    if svc:
        status, body, err = http(
            "GET",
            f"{url.rstrip('/')}/rest/v1/cities?select=id&limit=1",
            {"apikey": svc, "Authorization": f"Bearer {svc}"},
        )
        ok = status == 200
        report(
            "supabase service-role read",
            ok,
            (f"200 OK [key {mask(svc)}]" if ok else f"{err or status}: {short(body)}"),
        )
    else:
        report("supabase service-role read", None, "skipped — SUPABASE_SERVICE_ROLE_KEY not set")


def check_places() -> None:
    print(c("1", "── Places (Google Places API New) ──"))
    key = env("GOOGLE_PLACES_API_KEY")
    if not key:
        report("google places searchText", None, "skipped — GOOGLE_PLACES_API_KEY not set")
        return
    body = json.dumps({"textQuery": "top landmarks in London", "maxResultCount": 3}).encode()
    status, text, err = http(
        "POST",
        "https://places.googleapis.com/v1/places:searchText",
        {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body,
    )
    if status == 200:
        try:
            n = len(json.loads(text).get("places", []))
        except json.JSONDecodeError:
            n = "?"
        report("google places searchText", True, f"200 OK, {n} place(s) [key {mask(key)}]")
    else:
        # Surface Google's structured error.status/message (e.g. PERMISSION_DENIED,
        # "Places API (New) has not been used in project ... or is disabled").
        msg = short(text)
        try:
            j = json.loads(text).get("error", {})
            msg = f"{j.get('status', '')} — {j.get('message', short(text))}"
        except json.JSONDecodeError:
            pass
        report("google places searchText", False, f"{err or status}: {msg}")


def check_weather() -> None:
    print(c("1", "── Weather (OpenWeatherMap) ──"))
    key = env("OPENWEATHERMAP_API_KEY")
    if not key:
        report("openweathermap current", None, "skipped — OPENWEATHERMAP_API_KEY not set (Open-Meteo fallback needs no key)")
        return
    q = urllib.parse.urlencode({"q": "London", "appid": key})
    status, text, err = http("GET", f"https://api.openweathermap.org/data/2.5/weather?{q}")
    if status == 200:
        report("openweathermap current", True, f"200 OK [key {mask(key)}]")
    else:
        msg = short(text)
        try:
            msg = json.loads(text).get("message", msg)
        except json.JSONDecodeError:
            pass
        report("openweathermap current", False, f"{err or status}: {msg}")


def check_ai() -> None:
    print(c("1", "── AI (OpenAI / Gemini) ──"))
    preferred = (env("AI_PROVIDER") or "gemini").lower()
    report("AI_PROVIDER", None, f"preferred = {preferred}")

    openai_key = env("OPENAI_API_KEY")
    if openai_key:
        status, text, err = http(
            "GET",
            "https://api.openai.com/v1/models",
            {"Authorization": f"Bearer {openai_key}"},
        )
        if status == 200:
            report("openai key", True, f"200 OK [key {mask(openai_key)}]")
        else:
            msg = short(text)
            try:
                msg = json.loads(text).get("error", {}).get("message", msg)
            except json.JSONDecodeError:
                pass
            report("openai key", False, f"{err or status}: {msg}")
    else:
        report("openai key", None, "skipped — OPENAI_API_KEY not set")

    gem_key = env("GOOGLE_GEMINI_API_KEY")
    if gem_key:
        status, text, err = http(
            "GET",
            f"https://generativelanguage.googleapis.com/v1beta/models?key={urllib.parse.quote(gem_key)}",
        )
        if status == 200:
            report("gemini key", True, f"200 OK [key {mask(gem_key)}]")
        else:
            msg = short(text)
            try:
                msg = json.loads(text).get("error", {}).get("message", msg)
            except json.JSONDecodeError:
                pass
            report("gemini key", False, f"{err or status}: {msg}")
    else:
        report("gemini key", None, "skipped — GOOGLE_GEMINI_API_KEY not set")


def main() -> int:
    load_env_files()
    print("bestcityspots — key & service health check\n")
    check_database()
    check_places()
    check_weather()
    check_ai()

    passed = sum(1 for _, ok in results if ok is True)
    failed = sum(1 for _, ok in results if ok is False)
    skipped = sum(1 for _, ok in results if ok is None)
    print(f"\nSummary: {passed} pass, {failed} fail, {skipped} skipped")
    if failed:
        print(
            "\nTip: a failing Places check with PERMISSION_DENIED / 'API not enabled' means the\n"
            "key is valid but the *Places API (New)* (and billing) must be enabled in the Google\n"
            "Cloud project. A 401 on weather/AI means the key itself is wrong."
        )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
