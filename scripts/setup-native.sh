#!/usr/bin/env bash
# Pinned upstream dependencies outside the checkout. Never disables TLS/checksums.
set -euo pipefail
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
 echo 'This setup script targets Linux x86-64. See raylib platform instructions.' >&2; exit 1
fi
: "${DEPS_ROOT:=/workspace/deps}"
mkdir -p "$DEPS_ROOT/downloads"
ray_archive="$DEPS_ROOT/downloads/raylib-5.5.tar.gz"
lua_archive="$DEPS_ROOT/downloads/luajit-dd3b243.tar.gz"
# Download to a fresh temporary name so interrupted downloads never become cache hits.
fetch() {
 local url="$1" destination="$2"
 if [[ ! -f "$destination" ]]; then
  curl --fail --location --retry 2 --proto '=https' --tlsv1.2 "$url" -o "$destination.partial"
  mv "$destination.partial" "$destination"
 fi
}
fetch 'https://github.com/raysan5/raylib/releases/download/5.5/raylib-5.5_linux_amd64.tar.gz' "$ray_archive"
printf '%s  %s\n' '3d95ef03d5b38dfa55c0a16ca122d382134b078f0e5b270b52fe7eae0549c000' "$ray_archive" | sha256sum --check --status
if [[ ! -d "$DEPS_ROOT/raylib-5.5_linux_amd64" ]]; then tar -xzf "$ray_archive" -C "$DEPS_ROOT"; fi
fetch 'https://codeload.github.com/LuaJIT/LuaJIT/tar.gz/dd3b24369ddfaa83c78cd6fdd91d157c8968ec8d' "$lua_archive"
printf '%s  %s\n' 'a6ac8457c474c6fb71aaa7660dd5bf8f6e0506496fc74786b2dae18e26a768cc' "$lua_archive" | sha256sum --check --status
lua_source="$DEPS_ROOT/LuaJIT-dd3b24369ddfaa83c78cd6fdd91d157c8968ec8d"
if [[ ! -d "$lua_source" ]]; then tar -xzf "$lua_archive" -C "$DEPS_ROOT"; fi
make -C "$lua_source" -j2 PREFIX="$DEPS_ROOT/luajit" install
printf 'Dependencies ready. Build with RAYLIB_DIR=%s/raylib-5.5_linux_amd64 bash scripts/build-native.sh\n' "$DEPS_ROOT"
