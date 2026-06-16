#!/bin/sh

# =============================================================================
# Niveshaay n8n entrypoint
# -----------------------------------------------------------------------------
# Imports + activates the bundled workflow, then starts n8n.
# Runs as root throughout — Railway's volume mount is root-owned and
# privilege-drop binaries are not reliably present across n8n image versions.
# =============================================================================

WORKFLOW_ID=FhwYJXaTnQppph9r

# Make sure the home dir and data dir exist
mkdir -p /home/node/.n8n
export HOME=/home/node
export N8N_USER_FOLDER=/home/node

echo "[niveshaay] Whoami: $(whoami 2>/dev/null || id)"
echo "[niveshaay] which n8n: $(command -v n8n || echo 'not found')"
echo "[niveshaay] Workflow file:"
ls -la /home/node/workflow.json 2>&1 || echo "  (missing!)"
echo ""

echo "[niveshaay] Importing workflow..."
n8n import:workflow --input=/home/node/workflow.json 2>&1
echo "[niveshaay] Import exit code: $?"
echo ""

echo "[niveshaay] Listing workflows currently in DB:"
n8n list:workflow 2>&1 || echo "list:workflow failed"
echo ""

echo "[niveshaay] Activating workflow $WORKFLOW_ID..."
# Try the newer publish:workflow first, fall back to update:workflow --active=true
n8n update:workflow --id="$WORKFLOW_ID" --active=true 2>&1 || \
  n8n publish:workflow --id="$WORKFLOW_ID" 2>&1 || \
  echo "[niveshaay] Both activation commands failed"
echo ""

echo "[niveshaay] Starting n8n server..."
exec "$@"
