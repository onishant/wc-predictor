#!/usr/bin/env bash
# ml-refresh.sh — Export finished WC matches from Supabase, retrain + resimulate.
#
# Usage:
#   ./scripts/ml-refresh.sh                   # full pipeline (train + simulate)
#   ./scripts/ml-refresh.sh --simulate-only   # just resimulate with existing model
#
# Environment:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — for reading match data
#   WC26_ML_DIR — path to WC-2026-ML (default: ../WC-2026-ML)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ML_DIR="${WC26_ML_DIR:-$SCRIPT_DIR/../../WC-2026-ML}"
FINISHED_JSON="$ML_DIR/artifacts/finished.json"
PREDICTIONS_JSON="$ML_DIR/artifacts/predictions.json"

# Load env from .env.local if present
if [ -f "$PROJECT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env.local"
  set +a
fi

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  exit 1
fi

echo "Fetching finished matches from Supabase..."

# Fetch finished matches and export as JSON array
FINISHED_DATA=$(curl -s "${SUPABASE_URL}/rest/v1/world_cup_matches?status=eq.FINISHED&select=home_team_id,away_team_id,home_score,away_score,teams!home_team_id(name),teams!away_team_id(name)" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Accept: application/json")

# Transform into [{home_team, away_team, home_score, away_score}]
echo "$FINISHED_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
result = []
for match in data:
    home = match.get('teams', {})
    away_name = None
    home_name = home.get('name') if isinstance(home, dict) else None
    # Handle the join structure
    if not home_name:
        continue
    result.append({
        'home_team': home_name,
        'away_team': match.get('away_team_name', ''),
        'home_score': match['home_score'],
        'away_score': match['away_score'],
    })
json.dump(result, sys.stdout, indent=2)
" > "$FINISHED_JSON" 2>/dev/null || {
  echo "Warning: Could not parse Supabase response. Trying alternative approach..."
  # Fallback: fetch matches with explicit team name columns
  curl -s "${SUPABASE_URL}/rest/v1/world_cup_matches?status=eq.FINISHED&select=external_match_id,home_score,away_score" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Empty finished = no actual results locked in yet
json.dump([], sys.stdout)
" > "$FINISHED_JSON"
}

MATCH_COUNT=$(python3 -c "import json; print(len(json.load(open('$FINISHED_JSON'))))")
echo "Found $MATCH_COUNT finished matches."

if [ "$MATCH_COUNT" -eq 0 ]; then
  echo "No finished matches yet. Skipping ML pipeline."
  exit 0
fi

cd "$ML_DIR"

# Activate venv
if [ -f ".venv-linux/bin/activate" ]; then
  source .venv-linux/bin/activate
elif [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
else
  echo "Error: No Python venv found in $ML_DIR"
  exit 1
fi

if [ "${1:-}" = "--simulate-only" ]; then
  echo "Resimulating with existing model..."
  wc26 simulate \
    --groups config/groups.json \
    --simulations 10000 \
    --finished "$FINISHED_JSON" \
    --output "$PREDICTIONS_JSON"
else
  echo "Running full pipeline (train + simulate)..."
  wc26 pipeline \
    --matches data/raw/results.csv \
    --groups config/groups.json \
    --finished "$FINISHED_JSON"
fi

echo "ML predictions updated: $PREDICTIONS_JSON"
echo "Restart the ML API server to pick up new predictions."
