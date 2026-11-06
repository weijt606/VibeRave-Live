#!/usr/bin/env bash
# Self-signed dev TLS for the booth: a tiny local CA + one server cert whose
# SANs cover localhost and this machine's LAN address, so iPads and phones
# get a secure context (microphone / camera) over the local Wi-Fi.
#
#   scripts/make-dev-certs.sh [lan-ip|host.name ...]   # default: detect en0/en1
# The Mac's Bonjour name (<LocalHostName>.local) is always included, so
# https://<name>.local:4321 keeps working when DHCP hands out a new IP.
#
# Writes certs/ (gitignored): ca.key ca.pem server.key server.pem, and copies
# ca.pem to website/public/certs/viberave-dev-ca.pem so devices can fetch it
# at https://<host>:4321/certs/viberave-dev-ca.pem and trust it once.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/certs"
mkdir -p "$OUT" "$ROOT/website/public/certs"
IPS=("$@")
if [ ${#IPS[@]} -eq 0 ]; then
  for ifc in en0 en1; do ip=$(ipconfig getifaddr "$ifc" 2>/dev/null || true); [ -n "$ip" ] && IPS+=("$ip"); done
fi
SAN="DNS:localhost,IP:127.0.0.1"
LOCALNAME=$(scutil --get LocalHostName 2>/dev/null || true)
[ -n "$LOCALNAME" ] && SAN="$SAN,DNS:$(echo "$LOCALNAME" | tr 'A-Z' 'a-z').local"
for ip in "${IPS[@]}"; do
  case "$ip" in *[a-zA-Z]*) SAN="$SAN,DNS:$ip" ;; *) SAN="$SAN,IP:$ip" ;; esac
done
echo "SAN: $SAN"

if [ ! -f "$OUT/ca.key" ]; then
  openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
    -keyout "$OUT/ca.key" -out "$OUT/ca.pem" \
    -subj "/CN=VibeRave Dev CA/O=VibeRave" \
    -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" >/dev/null 2>&1
  echo "CA created: $OUT/ca.pem"
fi

openssl req -newkey rsa:2048 -nodes -keyout "$OUT/server.key" -out "$OUT/server.csr" \
  -subj "/CN=viberave-booth/O=VibeRave" >/dev/null 2>&1
cat > "$OUT/server.ext" <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=$SAN
EOF
openssl x509 -req -sha256 -days 825 -in "$OUT/server.csr" -CA "$OUT/ca.pem" -CAkey "$OUT/ca.key" -CAcreateserial \
  -out "$OUT/server.pem" -extfile "$OUT/server.ext" >/dev/null 2>&1
rm -f "$OUT/server.csr" "$OUT/server.ext"
cp "$OUT/ca.pem" "$ROOT/website/public/certs/viberave-dev-ca.pem"
echo "server cert: $OUT/server.pem (valid for $SAN)"
echo "device CA download: https://<host>:4321/certs/viberave-dev-ca.pem"
