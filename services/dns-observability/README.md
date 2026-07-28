# DNS Observability Stack (sanitized, article-friendly)

This folder contains the supporting material for the DNS observability work in the homelab.
It is based on a real build, but the details are sanitized so the repo can stay public-safe.

## What this gives you

- AdGuard query log ingestion into Loki
- OPNsense Unbound logs via remote syslog into Loki
- Unbound resolver metrics into Prometheus
- Grafana visualization for DNS flow and resolver health
- The main lessons learned:
  - Loki cardinality limits are real
  - AdGuard cache hits can still show an upstream resolver field
  - syslog filter selection matters more than it looks
  - bind mounts must live on the Docker host running the container

## Included files

- `README.md`
  - Repo overview, public-safe guidance, and operator notes
- `article-draft.md`
  - Full Medium-style draft in Phoenix voice
- `style-checklist.md`
  - Reusable writing checklist for future Medium posts
- `queries.md`
  - Sanitized LogQL / PromQL snippets used in the build
- `assets/README.md`
  - Screenshot and export plan for the Medium article

## How to use this folder

1. Treat this as the GitHub-side support bundle.
2. Keep the narrative and screenshots in the article.
3. Keep the copy-paste details, raw queries, and implementation notes here.
4. Replace placeholders with your environment-specific values before reuse.

## Medium vs GitHub split

Use Medium for:

- the story
- the problem
- the architecture overview
- the failures and fixes
- the screenshots
- the final result

Use GitHub for:

- query snippets
- config fragments
- file layout
- troubleshooting notes
- verification commands
- rollback notes

That split keeps the article readable without hiding the real implementation.

## Quick start

If you want to reproduce the shape of this setup:

1. Read `queries.md` first.
2. Read `article-draft.md` to understand the narrative and ordering.
3. Use `assets/README.md` to plan the screenshots you want to capture.
4. Adapt the values to your environment.

## Verification checklist

- Loki can ingest AdGuard logs without series explosion
- OPNsense syslog arrives at the Promtail receiver
- Prometheus scrapes Unbound metrics
- Grafana can render the DNS flow panel
- AdGuard cache hits are classified correctly
- The wildcard/rotated-log ingestion path is not used

## Common pitfalls

- Using a wildcard file path like `querylog.json*` and accidentally backfilling rotated logs
- Grouping on both domain and client over long time ranges in Loki
- Assuming `Upstream` means forwarded when AdGuard cache may still include it
- Mounting a config file path that does not exist on the Docker host
- Forgetting that syslog filtering in OPNsense can hide otherwise valid packets

## Notes on sanitization

This folder intentionally avoids:

- private IPs
- internal hostnames
- secrets and credentials
- device names that would fingerprint the homelab

When adapting it for your own repo, keep the public article sanitized and reserve the exact values for private notes or internal docs.
