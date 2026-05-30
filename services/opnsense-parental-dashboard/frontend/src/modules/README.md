# Frontend Modules

Each folder in this directory should represent one service or subsystem inside the homeserver dashboard.

Rules:

- Keep service-specific code inside its own module first.
- Only move code out when it is shared by more than one module.
- Avoid growing `features/dashboard/` into a second home for module logic.

Current:

- `opnsense/` live module

Planned:

- `tailscale/`
- `media/`
- `storage/`
- `observability/`
