# OPNsense firewall rules template (mixed LAN)

This project assumes kids devices are **mixed on the same LAN**. We enforce controls by keeping alias membership up to date and having firewall rules reference those aliases.

## Aliases this dashboard manages (defaults)
- `PARENT_DASH_ALLOWED_IPS` (host alias)
- `PARENT_DASH_BLOCKED_IPS` (host alias)

You can rename them via `.env` (`ALIAS_ALLOWED_IPS`, `ALIAS_BLOCKED_IPS`).

## Recommended rule order (LAN interface)
Create these rules on your LAN (or the interface where the kids devices live). Order matters: OPNsense matches **top to bottom**.

1) Allow “always allowed” devices
- **Action**: Pass
- **Source**: `PARENT_DASH_ALLOWED_IPS`
- **Destination**: any
- **Description**: `PARENT_DASH allow (always)`

2) Block “currently blocked” devices (schedule driven)
- **Action**: Block (or Reject)
- **Source**: `PARENT_DASH_BLOCKED_IPS`
- **Destination**: any
- **Description**: `PARENT_DASH block (schedule)`

3) Your normal LAN rules (existing)

## DNS hardening (recommended)
To reduce bypass on mixed LAN:

1) Create an alias for allowed DNS resolvers (usually just OPNsense LAN IP)
- Example alias: `PARENT_DASH_ALLOWED_DNS`
- Content: `192.168.1.1` (your OPNsense LAN IP)

2) Add a rule above general pass rules:
- **Pass**: LAN net → `PARENT_DASH_ALLOWED_DNS` on port 53/853 (as you prefer)

3) Add a rule to block external DNS:
- **Block**: LAN net → any on port 53/853

This ensures devices can’t easily bypass your DNS filtering by changing DNS to `8.8.8.8`.

## DHCP static mappings (recommended)
Static mappings make it harder for devices to evade controls by IP changes and makes MAC → IP mapping stable.

