# Homeserver Dashboard

Modular self-hosted dashboard with OPNsense currently implemented as the first live module.

## Current Direction

This repository is no longer treated as a standalone OPNsense-only frontend product.
It is being reshaped into a **homeserver dashboard** with:

- a shared dashboard shell
- top-level platform sections such as `Overview`, `Services`, `Network`, `Security`, `Logs`, `Settings`
- subsystem modules under those sections
- `OPNsense` as the first real module inside `Network`

## Repository Structure

```text
opnsense-parental-dashboard/
├── backend/                  FastAPI API, scheduler, worker, OPNsense integration
├── frontend/                 Next.js homeserver dashboard frontend
│   ├── app/                  Next app router entrypoints and global CSS
│   └── src/
│       ├── components/ui/    Reusable presentational components
│       ├── features/         Top-level dashboard feature shells
│       ├── modules/          Service-specific modules
│       │   ├── opnsense/     Live network module
│       │   ├── tailscale/    Planned
│       │   ├── media/        Planned
│       │   ├── storage/      Planned
│       │   └── observability/ Planned
│       ├── lib/              Shared utilities for frontend
│       └── types/            Shared frontend types
├── docs/                     Operational and architecture docs
├── ops/                      Backup and restore scripts
└── docker-compose.yml        Local stack
```

## Frontend Conventions

- `src/features/dashboard/` owns the homeserver shell and section routing state.
- `src/modules/<module-name>/` owns one subsystem at a time.
- `src/components/ui/` is for reusable display components only.
- Shared logic that is not tied to one module should move to `src/lib/` or `src/types/`.

When a new service is added, prefer:

1. create `frontend/src/modules/<service-name>/`
2. keep service-specific UI, types, and helpers inside that module first
3. promote only truly shared code into `components/ui`, `lib`, or `types`

## Backend Scope

The backend still provides the current OPNsense parental-control capabilities:

- alias management
- schedules and worker-driven enforcement
- DNSBL control
- device discovery
- usage inspection
- audit trail

## Local Development

From this folder:

1. Copy env file
```bash
cp .env.example .env
```

2. Start stack
```bash
docker compose up -d --build
```

3. Open services
- Backend docs: `http://localhost:8080/docs`
- Frontend: `http://localhost:3000`

## Notes

- `frontent-dashboard/` was removed after its design language was absorbed into the real frontend.
- The repository name still references the original OPNsense tool, but the internal structure now follows the broader homeserver product direction.
