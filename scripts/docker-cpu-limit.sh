#!/bin/bash
# Docker CPU limit script — limits the max CPU cores for the VirtuaLab Digital container
# so it never crashes your hardware on the 16GB laptop.
#
# Usage:
#   ./docker-cpu-limit.sh        # Apply CPU limit (2 cores)
#   ./docker-cpu-limit.sh 4      # Set to 4 cores
#   ./docker-cpu-limit.sh remove # Remove the limit

CONTAINER_NAME="virtulab-digital"
DEFAULT_CORES=2

if [ "$1" = "remove" ]; then
  echo "Removing CPU limit from $CONTAINER_NAME…"
  docker update --cpus=0 "$CONTAINER_NAME" 2>/dev/null && echo "✓ CPU limit removed" || echo "✗ Container not found"
  exit 0
fi

CORES="${1:-$DEFAULT_CORES}"

echo "Limiting $CONTAINER_NAME to $CORES CPU core(s)…"

if ! docker ps --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
  echo "✗ Container '$CONTAINER_NAME' is not running. Start with: docker compose up -d"
  exit 1
fi

docker update --cpus="$CORES" "$CONTAINER_NAME" 2>/dev/null && \
  echo "✓ $CONTAINER_NAME limited to $CORES CPU core(s)" || \
  echo "✗ Failed to set CPU limit"

docker update --memory=4g --memory-swap=4g "$CONTAINER_NAME" 2>/dev/null && \
  echo "✓ Memory limited to 4GB" || \
  echo "✗ Failed to set memory limit"
