#!/usr/bin/env bash
# Uso: N=100 M=20 scripts/concurrency-test.sh
set -euo pipefail

API="${API:-http://localhost:3000}"
N="${N:-100}"
M="${M:-20}"
K="${K:-10}"
AUTH_MODE="${AUTH_MODE:-local}"
RUN="$(date +%s)-$$"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

for cmd in curl jq xargs; do command -v "$cmd" >/dev/null || { echo "Falta $cmd" >&2; exit 2; }; done
(( N > M )) || { echo "N ($N) debe ser mayor que M ($M)" >&2; exit 2; }

curl_auth() {
  local who="$1"; shift
  if [[ "$AUTH_MODE" == "cognito" ]]; then
    local token
    if [[ "$who" == "admin" ]]; then token="$ADMIN_TOKEN"
    else token=$(sed -n "$(( who % $(wc -l < "$TOKENS_FILE") + 1 ))p" "$TOKENS_FILE"); fi
    curl -H "authorization: Bearer $token" "$@"
  elif [[ "$who" == "admin" ]]; then
    curl -H 'x-user-id: admin' -H 'x-user-groups: admin' "$@"
  else
    curl -H "x-user-id: loadtest-$who" -H "x-user-email: loadtest-$who@bookslot.local" "$@"
  fi
}
export -f curl_auth
export API AUTH_MODE ADMIN_TOKEN="${ADMIN_TOKEN:-}" TOKENS_FILE="${TOKENS_FILE:-}"

echo "Prueba de concurrencia: $N reservas a la vez sobre $M butacas"

movie=$(curl_auth admin -sf -X POST "$API/admin/movies" -H 'content-type: application/json' \
  -d "{\"title\":\"Concurrency $RUN\",\"durationMinutes\":90}" | jq -r .movieId)
room=$(curl_auth admin -sf -X POST "$API/admin/rooms" -H 'content-type: application/json' \
  -d "{\"name\":\"Sala test $RUN\",\"rows\":[{\"row\":\"A\",\"seats\":$M}]}" | jq -r .roomId)
starts=$(date -u -v+2d +%Y-%m-%dT20:00:00Z 2>/dev/null || date -u -d '+2 days' +%Y-%m-%dT20:00:00Z)
show=$(curl_auth admin -sf -X POST "$API/admin/shows" -H 'content-type: application/json' \
  -d "{\"movieId\":\"$movie\",\"roomId\":\"$room\",\"startsAt\":\"$starts\",\"priceCents\":800}" | jq -r .showId)

hold_request() {
  local i="$1" seat body code
  seat=$(printf 'A%02d' $(( i % M + 1 )))
  body=$(curl_auth "$i" -s -w '\n%{http_code}' -X POST "$API/shows/$SHOW/holds" \
    -H 'content-type: application/json' -H "idempotency-key: ct-$RUN-$i" -d "{\"seats\":[\"$seat\"]}")
  code=$(tail -n1 <<< "$body")
  echo "$i $seat $code $(head -n1 <<< "$body" | jq -r '.holdId // .error.code')"
}
export -f hold_request
export SHOW="$show" M RUN

seq 0 $((N - 1)) | xargs -P "$N" -I{} bash -c 'hold_request {}' > "$WORK/holds.txt"

confirmed=$(awk '$3 == 201' "$WORK/holds.txt" | wc -l | tr -d ' ')
soldout=$(awk '$3 == 409 && $4 == "SOLD_OUT"' "$WORK/holds.txt" | wc -l | tr -d ' ')
other=$(awk '$3 != 201 && !($3 == 409 && $4 == "SOLD_OUT")' "$WORK/holds.txt" | wc -l | tr -d ' ')
dup_seats=$(awk '$3 == 201 {print $2}' "$WORK/holds.txt" | sort | uniq -d | wc -l | tr -d ' ')


confirm_request() {
  curl_auth "$1" -s -o /dev/null -w '%{http_code}\n' -X POST "$API/holds/$2/confirm"
}
export -f confirm_request
awk '$3 == 201 {print $1, $4}' "$WORK/holds.txt" | xargs -P "$M" -n2 bash -c 'confirm_request "$0" "$1"' > "$WORK/confirm.txt"
booked=$(grep -c '^201$' "$WORK/confirm.txt" || true)

availability=$(curl -sf "$API/shows/$show")
available=$(jq '.show.available' <<< "$availability")
booked_seats=$(jq '[.seats[] | select(.status == "BOOKED")] | length' <<< "$availability")


idem_request() {
  curl_auth idem -s -X POST "$API/shows/$SHOW2/holds" -H 'content-type: application/json' \
    -H "idempotency-key: idem-$RUN" -d '{"seats":["A01","A02"]}' | jq -r '.holdId // .error.code'
}
export -f idem_request
show2=$(curl_auth admin -sf -X POST "$API/admin/shows" -H 'content-type: application/json' \
  -d "{\"movieId\":\"$movie\",\"roomId\":\"$room\",\"startsAt\":\"$starts\",\"priceCents\":800}" | jq -r .showId)
export SHOW2="$show2"
seq 1 "$K" | xargs -P "$K" -I{} bash -c 'idem_request' > "$WORK/idem.txt"
unique_holds=$(sort -u "$WORK/idem.txt" | wc -l | tr -d ' ')
held_after=$(curl -sf "$API/shows/$show2" | jq '[.seats[] | select(.status != "AVAILABLE")] | length')

echo
echo "Aceptadas (201):      $confirmed  (esperado $M)"
echo "Agotadas (409):       $soldout  (esperado $((N - M)))"
echo "Otros errores:        $other"
echo "Butacas duplicadas:   $dup_seats"
echo "Pagadas:              $booked  (esperado $M)"
echo "Plazas libres:        $available  (esperado 0)"
echo "Idempotencia:         $unique_holds reserva para $K reintentos"
echo

if [[ "$confirmed" == "$M" && "$soldout" == "$((N - M))" && "$other" == 0 && "$dup_seats" == 0 \
   && "$booked" == "$M" && "$booked_seats" == "$M" && "$available" == 0 \
   && "$unique_holds" == 1 && "$held_after" == 2 ]]; then
  echo "RESULTADO: OK, sin overbooking"
else
  echo "RESULTADO: FALLO"
  exit 1
fi
