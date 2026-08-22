#!/usr/bin/env bash
# Regenera las fuentes estáticas de la imagen OG.
#
# ImageResponse (satori) NO soporta fuentes variables ni woff2: hay que
# darle TTF estáticas. Estas se instancian desde las variables de Google
# a los mismos cortes que usa el sitio.
#
# Requiere `uv` (https://docs.astral.sh/uv/). Correr desde la raíz del repo.
set -euo pipefail

mkdir -p assets/fonts
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

base="https://raw.githubusercontent.com/google/fonts/main/ofl"

curl -sL -o "$tmp/fraunces-var.ttf" \
  "$base/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
curl -sL -o "$tmp/newsreader-var.ttf" \
  "$base/newsreader/Newsreader%5Bopsz%2Cwght%5D.ttf"

uvx --from fonttools fonttools varLib.instancer \
  "$tmp/fraunces-var.ttf" wght=700 opsz=48 SOFT=0 WONK=0 \
  -o assets/fonts/fraunces-700.ttf

uvx --from fonttools fonttools varLib.instancer \
  "$tmp/newsreader-var.ttf" wght=500 opsz=16 \
  -o assets/fonts/newsreader-500.ttf

echo "Listo:"
ls -la assets/fonts
