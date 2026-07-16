---
name: braves-notebook
description: Full API for Google NotebookLM - complete programmatic access including features not available in the web interface. Create notebooks, add sources, generate every artifact type, download in multiple formats. Triggers on explicit /braves-notebook or /notebooklm, or on intent such as "crea un podcast sobre X" (create a podcast about X), "instalar notebooklm" (install notebooklm)
---
<!-- notebooklm-py v0.3.4 | Ported from BrainClaude: https://github.com/Carlos-Vera/BrainClaude -->

# NotebookLM Automation

Speak to the user in the `language` set in `~/.claude/braves-skills.json`; if
unset, mirror the language the user writes in.

Full programmatic access to Google NotebookLM, including capabilities not
exposed in the web interface. Create notebooks, add sources (URLs, YouTube,
PDFs, audio, video, images), chat with the content, generate every artifact
type, and download results in multiple formats.

## Step 0: Setup (Runs Automatically on First Use)

When this skill activates and `notebooklm` isn't installed or authenticated
yet, complete setup first.

### Preflight: Check Python Version

`notebooklm-py` requires **Python 3.10+**. Check the available version
before installing:

```bash
python3 --version
```

If Python is below 3.10 (e.g. 3.9.x, macOS's default), install a compatible
version:

**macOS (Homebrew):**
```bash
brew install python@3.12
```
Then use `/opt/homebrew/bin/python3.12` (Apple Silicon) or
`/usr/local/bin/python3.12` (Intel) for the venv below.

**Linux (apt):**
```bash
sudo apt update && sudo apt install -y python3.12 python3.12-venv
```

### Install the CLI

Always use a virtual environment to avoid "externally-managed-environment"
errors and PATH issues.

Determine which Python to use - if the system's `python3` is 3.10+, use it
directly. Otherwise use the newly installed one (e.g. `python3.12`):

```bash
# Set PYTHON to the correct binary (adjust if needed)
PYTHON=$(command -v python3.12 2>/dev/null || command -v python3.11 2>/dev/null || command -v python3.10 2>/dev/null || command -v python3)

# Verify it's 3.10+
$PYTHON -c "import sys; assert sys.version_info >= (3,10), f'Python {sys.version} is too old - 3.10+ required'; print(f'Using Python {sys.version}')"

# Create venv and install
$PYTHON -m venv ~/.notebooklm-venv
source ~/.notebooklm-venv/bin/activate
pip install "notebooklm-py[browser]"
playwright install chromium
```

Then create a symlink so it's always in the PATH:
```bash
mkdir -p ~/bin
ln -sf ~/.notebooklm-venv/bin/notebooklm ~/bin/notebooklm
export PATH="$HOME/bin:$PATH"
```

Verify the CLI works:
```bash
notebooklm --help
```

### Authenticate

**IMPORTANT:** The built-in `notebooklm login` command requires interactive
terminal input (pressing Enter after logging in). Claude Code's bash tool
does NOT support interactive input, so `notebooklm login` will fail - the
browser opens and closes instantly. Instead, use this custom login script.

Tell the user:

> I'm going to open a browser window - just log into your Google account and
> navigate to notebooklm.google.com. Take your time, I'll wait for you to
> confirm before closing it.

Then write and run this login script:

```bash
cat > /tmp/nlm_login.py << 'PYEOF'
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright

STORAGE_PATH = Path.home() / ".notebooklm" / "storage_state.json"
PROFILE_PATH = Path.home() / ".notebooklm" / "browser_profile"
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

    cookie_names = [c["name"] for c in storage.get("cookies", [])]
    print(f"Saved {len(cookie_names)} cookies: {cookie_names}")
    browser.close()

SIGNAL_FILE.unlink(missing_ok=True)
print(f"Authentication saved to: {STORAGE_PATH}")
PYEOF

# Run the login script in the background
source ~/.notebooklm-venv/bin/activate
python3 /tmp/nlm_login.py > /tmp/nlm_login_output.txt 2>&1 &
echo "Login started (PID=$!). The browser should open in a few seconds..."
```

Wait ~10 seconds for the browser to open, then ask the user if they can see
the browser and have logged in.

Once the user confirms they're on the NotebookLM home page, save the
session:

```bash
touch /tmp/nlm_save_signal
sleep 8
cat /tmp/nlm_login_output.txt
```

Then verify authentication:

```bash
export PATH="$HOME/bin:$PATH"
notebooklm auth check
notebooklm list
```

If authentication passes (SID cookie present), confirm to the user that
NotebookLM is set up and ready. Clean up the temp script and restrict
permissions on the credentials file:

```bash
rm -f /tmp/nlm_login.py /tmp/nlm_login_output.txt /tmp/nlm_save_signal
chmod 600 ~/.notebooklm/storage_state.json
```

If authentication fails (SID cookie absent), the user may not have
completed login. Remove the browser profile and retry:

```bash
rm -rf ~/.notebooklm/browser_profile ~/.notebooklm/storage_state.json
```

Then run the login script again from the start.

---

## When This Skill Activates

**Explicit:** The user says "/notebooklm", "usar notebooklm" (use
notebooklm), "instalar notebooklm" (install notebooklm), or mentions the
tool by name

**Intent detection:** Recognize requests like:
- "Crea un podcast sobre [tema]" (Create a podcast about [topic])
- "Resume estas URLs/documentos" (Summarize these URLs/documents)
- "Genera un quiz de mi investigacion" (Generate a quiz from my research)
- "Convierte esto en un resumen de audio" (Turn this into an audio summary)
- "Crea tarjetas de estudio para repasar" (Create flashcards to review)
- "Genera un video explicativo" (Generate an explainer video)
- "Haz una infografia" (Make an infographic)
- "Crea un mapa mental de los conceptos" (Create a mind map of the concepts)
- "Descarga el quiz en markdown" (Download the quiz in markdown)
- "Anade estas fuentes a NotebookLM" (Add these sources to NotebookLM)

## Autonomy Rules

**Run automatically (no confirmation):**
- `notebooklm status` - check context
- `notebooklm auth check` - diagnose authentication issues
- `notebooklm list` - list notebooks
- `notebooklm source list` - list sources
- `notebooklm artifact list` - list artifacts
- `notebooklm language list` - list supported languages
- `notebooklm language get` - get current language
- `notebooklm language set` - set language (global config)
- `notebooklm artifact wait` - wait for the artifact to complete
- `notebooklm source wait` - wait for source processing
- `notebooklm research status` - check research status
- `notebooklm research wait` - wait for research
- `notebooklm use <id>` - set context
- `notebooklm create` - create notebook
- `notebooklm ask "..."` - chat queries (without `--save-as-note`)
- `notebooklm history` - show conversation history (read-only)
- `notebooklm source add` - add sources

**Ask before running:**
- `notebooklm delete` - destructive
- `notebooklm generate *` - long-running, can fail
- `notebooklm download *` - writes to the filesystem
- `notebooklm ask "..." --save-as-note` - writes a note
- `notebooklm history --save` - writes a note

## Quick Reference

| Task | Command |
|-------|---------|
| List notebooks | `notebooklm list` |
| Create notebook | `notebooklm create "Title"` |
| Set context | `notebooklm use <notebook_id>` |
| Show context | `notebooklm status` |
| Add URL source | `notebooklm source add "https://..."` |
| Add file | `notebooklm source add ./file.pdf` |
| Add YouTube | `notebooklm source add "https://youtube.com/..."` |
| List sources | `notebooklm source list` |
| Wait for source processing | `notebooklm source wait <source_id>` |
| Web research (quick) | `notebooklm source add-research "query"` |
| Web research (deep) | `notebooklm source add-research "query" --mode deep --no-wait` |
| Check research status | `notebooklm research status` |
| Wait for research | `notebooklm research wait --import-all` |
| Chat | `notebooklm ask "question"` |
| Chat (specific sources) | `notebooklm ask "question" -s src_id1 -s src_id2` |
| Chat (with references) | `notebooklm ask "question" --json` |
| Chat (save answer as note) | `notebooklm ask "question" --save-as-note` |
| Show conversation history | `notebooklm history` |
| Save entire history as note | `notebooklm history --save` |
| Get full source text | `notebooklm source fulltext <source_id>` |
| Generate podcast | `notebooklm generate audio "instructions"` |
| Generate video | `notebooklm generate video "instructions"` |
| Generate report | `notebooklm generate report --format briefing-doc` |
| Generate quiz | `notebooklm generate quiz` |
| Generate flashcards | `notebooklm generate flashcards` |
| Generate infographic | `notebooklm generate infographic` |
| Generate mind map | `notebooklm generate mind-map` |
| Generate slide deck | `notebooklm generate slide-deck` |
| Revise a slide | `notebooklm generate revise-slide "prompt" --artifact <id> --slide 0` |
| Check artifact status | `notebooklm artifact list` |
| Wait for completion | `notebooklm artifact wait <artifact_id>` |
| Download audio | `notebooklm download audio ./output.mp3` |
| Download video | `notebooklm download video ./output.mp4` |
| Download slide deck (PDF) | `notebooklm download slide-deck ./slides.pdf` |
| Download slide deck (PPTX) | `notebooklm download slide-deck ./slides.pptx --format pptx` |
| Download report | `notebooklm download report ./report.md` |
| Download mind map | `notebooklm download mind-map ./map.json` |
| Download data table | `notebooklm download data-table ./data.csv` |
| Download quiz | `notebooklm download quiz quiz.json` |
| Download flashcards | `notebooklm download flashcards flashcards.json` |
| List languages | `notebooklm language list` |
| Set language | `notebooklm language set zh_Hans` |

## Generation Types

All generation commands support:
- `-s, --source` to use specific source(s) instead of all sources
- `--language` to set the output language (defaults to 'en')
- `--json` for machine-readable output
- `--retry N` to automatically retry on rate limits

| Type | Command | Options | Download |
|------|---------|----------|----------|
| Podcast | `generate audio` | `--format [deep-dive\|brief\|critique\|debate]`, `--length [short\|default\|long]` | .mp3 |
| Video | `generate video` | `--format [explainer\|brief]`, `--style [auto\|classic\|whiteboard\|kawaii\|anime\|watercolor\|retro-print\|heritage\|paper-craft]` | .mp4 |
| Slide Deck | `generate slide-deck` | `--format [detailed\|presenter]`, `--length [default\|short]` | .pdf / .pptx |
| Slide Revision | `generate revise-slide "prompt" --artifact <id> --slide N` | `--wait`, `--notebook` | *(re-download the main slide deck)* |
| Infographic | `generate infographic` | `--orientation [landscape\|portrait\|square]`, `--detail [concise\|standard\|detailed]` | .png |
| Report | `generate report` | `--format [briefing-doc\|study-guide\|blog-post\|custom]`, `--append "extra instructions"` | .md |
| Mind Map | `generate mind-map` | *(synchronous, instant)* | .json |
| Data Table | `generate data-table` | description required | .csv |
| Quiz | `generate quiz` | `--difficulty [easy\|medium\|hard]`, `--quantity [fewer\|standard\|more]` | .json/.md/.html |
| Flashcards | `generate flashcards` | `--difficulty [easy\|medium\|hard]`, `--quantity [fewer\|standard\|more]` | .json/.md/.html |

## Common Workflows

### From Research to Podcast
1. `notebooklm create "Research: [topic]"`
2. `notebooklm source add` for each URL/document
3. Wait for sources: `notebooklm source list --json` until all have
   status=READY
4. `notebooklm generate audio "Focus on [specific angle]"`
5. Check `notebooklm artifact list` for status
6. `notebooklm download audio ./podcast.mp3` once complete

### Document Analysis
1. `notebooklm create "Analysis: [project]"`
2. `notebooklm source add ./doc.pdf` (or URLs)
3. `notebooklm ask "Summarize the key points"`
4. Keep chatting as needed

## Output Formats (--json)

```json
// notebooklm list --json
{"notebooks": [{"id": "...", "title": "...", "created_at": "..."}]}

// notebooklm source list --json
{"sources": [{"id": "...", "title": "...", "status": "ready|processing|error"}]}

// notebooklm artifact list --json
{"artifacts": [{"id": "...", "title": "...", "type": "Audio Overview", "status": "in_progress|pending|completed|unknown"}]}
```

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| Authentication/cookie error | Session expired | Run `notebooklm login` again |
| "No notebook context" | Context not set | Run `notebooklm use <id>` |
| Rate limit | Google throttling | Wait 5-10 min, retry |
| Download failure | Incomplete generation | Check `artifact list` for status |

## Known Limitations

- Audio, video, quiz, flashcard, infographic, and slide-deck generation can
  fail due to Google rate limits
- Generation times: audio 10-20 min, video 15-45 min, quiz/flashcards
  5-15 min
- This is an unofficial API - Google may change things without notice
