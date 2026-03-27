#!/bin/bash

# --- CONFIGURATION ---
# 1. Incoming arguments from qBittorrent
# %F = Content Path (e.g., /downloads/MyMovie.mkv)
# %L = Category (e.g., videos)
# %N = Torrent Name (e.g., MyMovie)
TORRENT_PATH="$1"
CATEGORY="$2"
TORRENT_NAME="$3"

# 2. Destination Root (The "Bridge" folder inside qBit container)
DEST_ROOT="/media_final"

# 3. Log File (For debugging)
LOG="/config/qbit_move.log"

echo "------------------------------------------------" >> "$LOG"
echo "[$(date)] FINISHED: $TORRENT_NAME ($CATEGORY)" >> "$LOG"

# --- CATEGORY MAPPING ---
# Maps qBit categories to Jellyfin folder names
case "$CATEGORY" in
    "movies")
        FINAL_DIR="$DEST_ROOT/videos"
        ;;
    "animated")
        FINAL_DIR="$DEST_ROOT/Animated"
        ;;
    "shows")
        FINAL_DIR="$DEST_ROOT/shows"
        ;;
    "musics")
        FINAL_DIR="$DEST_ROOT/musics"
        ;;
    *)
        # Safety Net: If no category, do nothing.
        echo "  [SKIP] Unknown or empty category. Leaving in Downloads." >> "$LOG"
        exit 0
        ;;
esac

# Create the folder if it doesn't exist yet
mkdir -p "$FINAL_DIR"

# --- THE MOVE LOGIC ---
echo "  [MOVE] Moving content..." >> "$LOG"

# We use 'mv' to move the file. 
# NOTE: This will make the torrent turn 'Red' (Error) in qBittorrent 
# because the file is gone. You should remove the torrent from qBit afterwards.
echo "  [MOVE] Processing $TYPE: $TORRENT_NAME" >> "$LOG"

# Try to move and capture the output
if mv "$TORRENT_PATH" "$FINAL_DIR/" >> "$LOG" 2>&1; then
    # IF move was successful (Exit Code 0)

    # Permission Fix
    chmod -R 777 "$FINAL_DIR/$TORRENT_NAME"

    echo "  [SUCCESS] Moved to $FINAL_DIR" >> "$LOG"
else
    # IF move failed (Exit Code != 0)
    echo "  [ERROR] Move Failed! Check permissions or disk space." >> "$LOG"
    exit 1
fi
