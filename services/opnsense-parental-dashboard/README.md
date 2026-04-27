# OPNsense Parental Dashboard

Self-hosted dashboard for **simple parental controls** backed by **OPNsense API**.

## What it does (v1)
- **Overview**: basic status checks + feature availability (preflight)
- **Devices**: manage a list of devices (MAC, last known IP, friendly name, profile)
- **Whitelists / Blocklists**: manage OPNsense **Firewall Aliases**
- **Schedules**: define schedules in DB; worker applies them by updating aliases
- **DNS filtering**: manage Unbound DNSBL lists (Family mode) via API

## How enforcement works (important)
Your kids devices are mixed on the same LAN. This project enforces controls by:
- maintaining **alias membership** based on devices (MAC → current IP)
- letting you create OPNsense firewall rules that reference those aliases

This is easier to bypass than a dedicated kids VLAN (e.g., MAC spoofing). The recommended hardening path is:
- DHCP static mappings for kids devices
- force DNS to OPNsense (block outbound DNS except to OPNsense)
- later: move kids devices to a VLAN/interface

## Quick start (local dev)
From this folder:

1) Copy env file
```bash
cp .env.example .env
```

2) Start stack
```bash
docker compose up -d --build
```

3) Preflight (tests OPNsense connectivity + feature availability)
- Backend: `http://localhost:8080/api/preflight`
- Frontend: `http://localhost:3000`

## Security notes (v1)
- Backend requires `Authorization: Bearer $ADMIN_TOKEN` for any write action.
- Keep this **LAN-only**. For remote access, use VPN (Tailscale/WireGuard) rather than exposing ports publicly.

## Audit log + rollback
- Audit events: `GET /api/audit` (requires admin token)
- Rollback last alias change (best-effort): `POST /api/aliases/rollback/{aliasName}`

## Backups
From this folder:
```bash
./ops/backup_db.sh backups/backup-$(date +%F).sql
```

## OPNsense setup checklist
1) Create an API key/secret in OPNsense for a dedicated user.
2) Ensure the home server can reach OPNsense management IP/hostname.
3) Enable and configure:
   - Unbound + DNSBL (if using family filtering)
   - DHCP (recommended) to map MAC → IP reliably
4) Add firewall rules that reference the aliases this app manages (see below).

### Managed aliases (defaults)
You can rename these in `.env`:
- `PARENT_DASH_ALLOWED_IPS`
- `PARENT_DASH_BLOCKED_IPS`

### Suggested rule template (manual in OPNsense UI)
On LAN (or your relevant interface), create rules in this order:
1) **Pass**: source `PARENT_DASH_ALLOWED_IPS` → any
2) **Block** (scheduled): source `PARENT_DASH_BLOCKED_IPS` → any
3) Normal LAN rules as you already have

## URLs
- Backend OpenAPI: `http://localhost:8080/docs`

