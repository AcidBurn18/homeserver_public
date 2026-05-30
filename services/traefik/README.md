# Traefik homelab setup (sanitized, production-style)

This folder contains a practical Traefik setup you can run on your own server.
It is based on a real homelab deployment.

Use this as a template, not a drop-in file.

## What this gives you

- Traefik v3 with file provider (`dynamic/*.yml`)
- HTTP -> HTTPS redirect pattern for standard apps
- Wildcard TLS certificate loading
- Reusable middleware chains (`media`, `app`, `admin`)
- Exception handling examples for:
  - Nextcloud (`nextcloud-chain`, DAV redirect)
  - Home Assistant (`ha-chain`)
  - Admin HTTPS backends with self-signed certs (`insecure-transport`)
- Fallback catch-all router for unmatched `*.home.int` hosts
- JSON access logs + Prometheus metrics endpoint

## Included files

- `docker-compose.yaml`
  - Runs `traefik`, `step-ca`, and `fallback-site`
- `.env.example`
  - Placeholder environment variables
- `dynamic/01-tls.yml`
  - Wildcard certificate mapping
- `dynamic/05-transports.yml`
  - `serversTransport` for internal self-signed HTTPS backends
- `dynamic/10-middleware.yml`
  - Redirect, security headers, rate limiting, chain middlewares
- `dynamic/20-services.yml`
  - Routers + backend services (sanitized host placeholders)
- `dynamic/99-fallback.yml`
  - Low-priority fallback router

## docker-compose.yaml explained (quick)

This compose runs 3 containers:

- `step-ca` (private CA)
  - Issues internal certificates for your homelab.
  - ACME is enabled (`DOCKER_STEPCA_INIT_ACME=true`) so Traefik can request certs automatically.
  - Uses `step_ca` volume so CA state persists across restarts.

- `traefik` (reverse proxy)
  - Exposes `80` (HTTP), `443` (HTTPS), `9100` (Prometheus metrics), and dashboard via `8090`.
  - Loads dynamic routers/services/middlewares from `./dynamic`.
  - Writes JSON access logs to `./logs/access.log`.
  - Mounts `step_ca` volume read-only so it can trust/use Step-CA cert material when needed.

- `fallback-site` (default page)
  - Simple Nginx static page for unmatched hosts.

Why this split is useful:
- clean routing in `dynamic/*.yml`
- persistent internal CA
- built-in observability (logs + metrics)
- safe fallback behavior for unknown subdomains

## Prerequisites

- Docker Engine + Docker Compose plugin
- Internal DNS (or host overrides) for your service hostnames
- Wildcard cert/key files for your internal domain
- Basic firewalling around management/metrics/dashboard ports

## Quick start

1) Copy this folder to your Traefik host.

2) Create environment file:

```bash
cp .env.example .env
```

3) Update placeholders in `dynamic/20-services.yml`:

- Replace `REPLACE_*` backend host placeholders with your real backend IPs or DNS names.
- Keep protocols/ports correct (`http://` vs `https://`).

4) Add your wildcard cert and key files under `./certs/`:

- `wildcard.home.int.crt`
- `wildcard.home.int.key`

If your internal domain is not `home.int`, adjust host rules and cert filenames accordingly.

5) Create required directories:

```bash
mkdir -p dynamic certs logs fallback
```

6) Start stack:

```bash
docker compose up -d
```

7) Verify Traefik is up:

```bash
docker compose ps
```

## Step-CA trust: export and install root CA (laptop + mobile)

Important: this is separate from Traefik server setup.
Traefik can issue certs, but your clients must trust your Step-CA root CA to avoid browser/app TLS warnings.

1) Export root CA from the running Step-CA container:

```bash
docker compose cp step-ca:/home/step/certs/root_ca.crt ./certs/root_ca.crt
```

2) Verify fingerprint (share this with family/team so they can verify they installed the correct cert):

```bash
openssl x509 -in ./certs/root_ca.crt -noout -fingerprint -sha256
```

3) Install on laptop (macOS):

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./certs/root_ca.crt
```

4) Install on mobile:

- iPhone/iPad (iOS):
  - Send `root_ca.crt` to phone (AirDrop/email/files)
  - Open file -> install profile
  - Then go to: Settings -> General -> About -> Certificate Trust Settings
  - Enable full trust for that root certificate
- Android:
  - Install CA cert from security settings (path varies by vendor)
  - Note: many apps ignore user-installed CAs by design; browsers usually work, some apps may still fail

5) Client verification:

```bash
curl -v https://nextcloud.home.int
openssl s_client -connect nextcloud.home.int:443 -servername nextcloud.home.int </dev/null | grep -E "issuer=|Verify return code"
```

You should see successful TLS verification (`Verify return code: 0 (ok)`).

## Post-deploy verification

Check DNS resolution for one app:

```bash
dig +short nextcloud.home.int
```

Check HTTP -> HTTPS redirect:

```bash
curl -I http://nextcloud.home.int
```

Check TLS handshake:

```bash
openssl s_client -connect nextcloud.home.int:443 -servername nextcloud.home.int
```

Check metrics endpoint:

```bash
curl -fsS http://<traefik-host>:9100/metrics | head
```

Check access logs:

```bash
tail -f logs/access.log
```

## How routing is structured

- Standard services:
  - `*-http` router on `web` with `redirect-to-https`
  - `*-https` router on `websecure` with `tls: {}`
- Exception services:
  - Nextcloud uses `nextcloud-chain` (forwarded headers + DAV handling)
  - Home Assistant uses `ha-chain`
  - OPNsense/Proxmox-style HTTPS backends use `insecure-transport@file`

## Security notes

- This repo intentionally avoids real secrets and real private network values.
- Keep real credentials in `.env` or secret manager only.
- Restrict dashboard and metrics access at network level.
- `insecureSkipVerify: true` should be used only for trusted internal backends.
  Prefer valid backend cert trust where possible.

## Common pitfalls

- DNS hostnames do not match Traefik `Host(...)` rules
- Wrong backend protocol/port in `dynamic/20-services.yml`
- Missing wildcard cert files or wrong filenames
- Running another service already bound to `:80` or `:443`
- Forgetting to reload after file changes (compose restart if needed)

## Customization tips

- Add/remove services in `dynamic/20-services.yml`
- Reuse chains from `dynamic/10-middleware.yml` instead of duplicating middleware
- For strict HTTPS-only environments, remove HTTP routers and redirect middleware

## Disclaimer

This is a sanitized, article-friendly reference config.
You must adapt hostnames, cert paths, and backend targets for your environment before production use.
