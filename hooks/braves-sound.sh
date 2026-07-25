#!/bin/sh
# braves-skills sound alerts.
#   braves-sound.sh permission   -> Claude needs permission (or is waiting)
#   braves-sound.sh done         -> Claude finished the task
#   braves-sound.sh preview N... -> announce "1. <name>" then play each tone,
#                                   spoken in the user's configured language
#                                   (used by braves-setup to let them choose)
# Configured in ~/.claude/braves-skills.json under "sounds".
# No "sounds" block = the alerts are off.
EVENT="$1"
CONFIG="$HOME/.claude/braves-skills.json"
[ -f "$CONFIG" ] || exit 0

TL="/System/Library/PrivateFrameworks/ToneLibrary.framework/Versions/A/Resources"
ALERTS="/System/Library/ExtensionKit/Extensions/Sound.appex/Contents/Resources/AlertSounds.loctable"

# tone base name -> playable path (falls back to Glass)
resolve() {
  for candidate in \
    "/System/Library/Sounds/$1.aiff" \
    "$TL/Ringtones/$1.m4r" \
    "$TL/AlertTones/Modern/$1.m4r" \
    "$TL/AlertTones/Classic/$1.m4r"
  do
    [ -f "$candidate" ] && { printf '%s\n' "$candidate"; return; }
  done
  printf '%s\n' "/System/Library/Sounds/Glass.aiff"
}

# tone base name + lang -> name as macOS shows it (falls back to the file name)
display() {
  name=$(plutil -extract "$2.system:$1" raw -o - "$TL/TL.loctable" 2>/dev/null) ||
    name=$(plutil -extract "$2.$1" raw -o - "$ALERTS" 2>/dev/null)
  [ -n "$name" ] && printf '%s\n' "$name" || printf '%s\n' "$1"
}

if [ "$EVENT" = "preview" ]; then
  [ "$(uname -s)" = "Darwin" ] || exit 0
  shift
  lang=$(tr -d '\n\r\t' < "$CONFIG" | sed -n 's/.*"language"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  [ -n "$lang" ] || lang="es"
  # Plain-named voices first (Mónica, Paulina); the parenthesized ones are novelties.
  voice=$(say -v '?' 2>/dev/null | sed -n "s/^\([^(]*[^ (]\)  *${lang}_[A-Z]*  *#.*/\1/p" | head -1)
  i=1
  for tone in "$@"; do
    label="$i. $(display "$tone" "$lang")"
    if [ -n "$voice" ]; then say -v "$voice" "$label" 2>/dev/null; else say "$label" 2>/dev/null; fi
    afplay "$(resolve "$tone")" 2>/dev/null
    i=$((i + 1))
  done
  exit 0
fi

# Newlines only: tone names contain spaces ("Choo Choo", "News Flash").
block=$(tr -d '\n\r\t' < "$CONFIG" |
  sed -n 's/.*"sounds"[[:space:]]*:[[:space:]]*{\([^}]*\)}.*/\1/p')
[ -n "$block" ] || exit 0
tone=$(printf '%s' "$block" |
  sed -n "s/.*\"$EVENT\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p")
[ -n "$tone" ] || exit 0

case "$(uname -s)" in
  Darwin)
    # Detached: tones run up to ~3s and the hook must not stall the turn.
    ( afplay "$(resolve "$tone")" >/dev/null 2>&1 & )
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows*)
    # ponytail: Windows uses the two standard system sounds, not configurable.
    # Add a name->SystemSounds map here if someone asks to customize them.
    if [ "$EVENT" = "permission" ]; then w=Exclamation; else w=Asterisk; fi
    powershell.exe -NoProfile -Command \
      "[System.Media.SystemSounds]::$w.Play(); Start-Sleep -Milliseconds 700" 2>/dev/null
    ;;
  *)
    # ponytail: Linux is not a target platform, best effort only.
    command -v paplay >/dev/null 2>&1 &&
      paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null
    ;;
esac
exit 0
