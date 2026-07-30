#!/usr/bin/env python3
"""Interactive Google login helper for NotebookLM.

Opens a visible (non-headless) browser so the user can log into Google and
navigate to NotebookLM. Waits for a signal file (/tmp/nlm_save_signal) before
capturing the authenticated session to wherever the CLI expects it.

Invoked by the braves-notebook skill (skills/braves-notebook/SKILL.md) during
its Authenticate step, because the built-in `notebooklm login` command needs
interactive terminal input that Claude Code's bash tool cannot provide. Run it
with the CLI's own interpreter (the skill activates ~/.notebooklm-venv first).

Paths are asked of the CLI, never hardcoded: notebooklm-py stores the session
per profile under ~/.notebooklm/profiles/<name>/, and only falls back to the
old ~/.notebooklm/storage_state.json when that file does not exist. Writing to
the old location on a machine that already has a profile produces a session the
CLI silently ignores.
"""

import json, time
from pathlib import Path

from playwright.sync_api import sync_playwright

try:
    from notebooklm.paths import get_browser_profile_dir, get_storage_path
except ImportError:  # pragma: no cover - environment error, not a code path
    raise SystemExit(
        "Cannot import notebooklm. Run this with the CLI's interpreter:\n"
        "  source ~/.notebooklm-venv/bin/activate && python3 <this script>"
    )

STORAGE_PATH = get_storage_path()
PROFILE_PATH = get_browser_profile_dir()
SIGNAL_FILE = Path("/tmp/nlm_save_signal")

SIGNAL_FILE.unlink(missing_ok=True)
STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)

print("Opening browser for Google login...")
print("Log into Google and navigate to notebooklm.google.com")

with sync_playwright() as p:
    browser = p.chromium.launch_persistent_context(
        user_data_dir=str(PROFILE_PATH),
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
    )
    page = browser.pages[0] if browser.pages else browser.new_page()
    page.goto("https://notebooklm.google.com/")

    print("Browser is open. Waiting for save signal...")
    while not SIGNAL_FILE.exists():
        time.sleep(1)

    print("Save signal received! Capturing session...")
    storage = browser.storage_state()
    with open(STORAGE_PATH, "w") as f:
        json.dump(storage, f)
    # Restricted here rather than in a follow-up shell step: this file is a
    # live Google session, and the chmod must not be skippable or aimed at a
    # path that drifted from the one just written.
    STORAGE_PATH.chmod(0o600)

    cookie_names = [c["name"] for c in storage.get("cookies", [])]
    print(f"Saved {len(cookie_names)} cookies: {cookie_names}")
    browser.close()

SIGNAL_FILE.unlink(missing_ok=True)
print(f"Authentication saved to: {STORAGE_PATH} (mode 600)")
