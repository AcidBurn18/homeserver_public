#!/bin/bash
# sync.sh - Specialized for M5 Air (24GB) Multi-Repo Setup

# 1. Configuration
HUB_NAME="ai_context_hub"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
mkdir -p "$HUB_NAME"

echo "--- 🧠 PHASE 1: Updating GitNexus Mind Map ---"
for d in */; do
    # Skip the context hub itself
    if [ "$d" == "$HUB_NAME/" ]; then continue; fi
    
    if [ -d "$d" ]; then
        dir_name="${d%/}"
        echo "Indexing: $dir_name"
        cd "$d"
        # Silent local indexing to save CPU on M5
        npx -y gitnexus@latest analyze --force > /dev/null 2>&1
        cd ..
    fi
done

echo "--- 📦 PHASE 2: Generating AI-Ready States ---"
for d in */; do
    if [ "$d" == "$HUB_NAME/" ]; then continue; fi
    
    if [ -d "$d" ]; then
        dir_name="${d%/}"
        # Better Naming: Project_Date_Time.xml
        OUTPUT_NAME="${HUB_NAME}/${dir_name}_${TIMESTAMP}.xml"
        
        echo "Packing: $dir_name -> $OUTPUT_NAME"
        
        # We target the directory, use Tree-Sitter compression, and save to Hub
        npx -y repomix "$d" --output "$OUTPUT_NAME" --compress --style xml
    fi
done

echo "--- 🧹 PHASE 3: Cleaning Old States (Keep last 5) ---"
# This keeps your M5 Air storage clean by removing files older than 5 days
find "$HUB_NAME" -name "*.xml" -mtime +5 -delete

echo "✅ All states synced to: ./$HUB_NAME/"
ls -1 "$HUB_NAME" | grep "$TIMESTAMP"