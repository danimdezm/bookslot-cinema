# BookSlot Cinema

Plataforma de reserva de entradas de cine con butacas numeradas y disponibilidad en tiempo real.

- Cartelera, sesiones por día y mapa de butacas que se actualiza en vivo.
- Reserva en dos pasos: las butacas quedan retenidas 10 minutos mientras se paga.
- Sin overbooking: si varias personas reservan la misma butaca a la vez, solo una lo consigue.
- Reservas idempotentes: reintentar una reserva no crea otra.
- Cancelación gratuita hasta 2 horas antes de la sesión.
- Emails de confirmación, cancelación y recordatorio.
- Panel de administración: películas, salas, sesiones, bloqueo de sesiones y auditoría de reservas.

Backend en TypeScript sobre AWS Lambda y DynamoDB, frontend en React y la infraestructura en Terraform.

## Requisitos

- Node 24 y pnpm
- Docker

## Levantar en local

```bash
corepack enable
pnpm install
docker compose up -d
pnpm dev:api
pnpm seed
pnpm dev:web
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Emails (Mailpit): http://localhost:8025
- Tabla de DynamoDB: http://localhost:8001

En el login hay accesos rápidos de demo para cliente y administrador.

## Tests

```bash
pnpm test
pnpm test:integration
N=100 M=20 scripts/concurrency-test.sh
```

La prueba de concurrencia lanza N reservas simultáneas sobre una sala de M butacas y comprueba que se confirman exactamente M. Salida: [docs/concurrency-test-output.txt](docs/concurrency-test-output.txt).
