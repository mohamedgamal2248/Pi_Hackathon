#!/usr/bin/env bash
# Shallow-clone every repository listed in pi-apps-repos.csv into ./pi-apps (not committed).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p pi-apps
tail -n +2 pi-apps-repos.csv | cut -d, -f1 | tr -d '"' | while read -r name; do
  [ -d "pi-apps/$name" ] || git clone -q --depth 1 "https://github.com/pi-apps/$name.git" "pi-apps/$name" || echo "failed: $name"
done
