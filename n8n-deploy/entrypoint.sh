#!/bin/sh

# Imports + activates the bundled workflow on Railway boot, then starts n8n.
# Stays as root: Railway's volume is root-owned and privilege-drop binaries
# aren't reliably present across n8n image versions.

WORKFLOW_ID=FhwYJXaTnQppph9r

mkdir -p /home/node/.n8n
export HOME=/home/node
export N8N_USER_FOLDER=/home/node

echo "[niveshaay] Importing workflow..."
n8n import:workflow --input=/home/node/workflow.json

echo "[niveshaay] Activating $WORKFLOW_ID..."
n8n update:workflow --id="$WORKFLOW_ID" --active=true 2>&1 || \
  n8n publish:workflow --id="$WORKFLOW_ID" 2>&1 || \
  echo "[niveshaay] activation failed"

echo "[niveshaay] Starting n8n..."
exec "$@"
