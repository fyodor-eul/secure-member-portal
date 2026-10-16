#!/usr/bin/env bash

set -u

export PORT="${PORT:-3000}"
URL="http://localhost:$PORT"
LOG=$(mktemp)

# Run the server in the background, logs it outputs and store its pid
node ./server.js >&"$LOG" &
SERVER_PID="$!"

# If anything goes wrong kill the server and remove the logs
trap 'kill "$SERVER_PID"; rm -f "$LOG"' exit

# Wait 15s for the server to start listening
for _ in $(seq 1 10); do
  curl -s -o /dev/null "$URL/" && break
  sleep 1
done

# Check 1: Home Page
status_code=$(
  curl -s -o /dev/null -w '%{http_code}' "$URL/"
)
[[ "$status_code" == '200' ]] || {
  echo "[ FAIL ] GET / -> $status_code"
  echo "==============LOG==============="
  cat "$LOG"
  echo "==============LOG==============="
  exit 1
}
echo "[ PASS ] GET / -> $status_code"

# Check 2: MongoDB
status_code=$(
  curl -s -o /dev/null -w '%{http_code}' \
    -X POST --max-time 15 \
    -H 'Content-Type: application/json' \
    -d '{"name": "ci-user", "password":"ci-password"}' \
    "$URL/login-member"
)
[[ "$status_code" == '401' ]] || {
  echo "[ FAIL ] POST /login-member"
  echo "==============LOG==============="
  cat "$LOG"
  echo "==============LOG==============="
  exit 1
}
echo "[ PASS ] POST /login-member -> $status_code (Invalid Credentials)"
