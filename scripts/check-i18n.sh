#!/usr/bin/env bash
set -euo pipefail

echo "Checking for i18n keys used but not defined..."

grep -rhoP "t\(\s*['\"][^'\"]+['\"]\s*\)" src | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/" | sort -u > /tmp/used_i18n_keys.txt || true
sed -n "/en: {/,/},/p" src/i18n/index.ts | grep -oP "^[ \t]*\K[^:]+(?=:\s*['\"])" | sed 's/"//g' | sort -u > /tmp/defined_i18n_keys.txt || true

echo "Used keys not defined in English dict:"
comm -23 /tmp/used_i18n_keys.txt /tmp/defined_i18n_keys.txt || true

echo "Done."