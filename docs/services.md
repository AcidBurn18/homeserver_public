# Service Placement

This document maps the major services in the homelab to their current node roles. It is meant to explain where workloads live and how this repository relates to the running environment.

The repo is not yet a full source of truth for every service in the homelab, but it already captures a large part of the application layer and some shared platform configuration.

## Node-Level Service Map

## Firewall Node

- Host type: Proxmox
- Core VM:
  - OPNsense
- Primary responsibilities:
  - gateway and firewall
  - traffic control
  - Unbound as upstream recursive DNS resolver

## Infra Node

- Host type: server dedicated to support-plane services
- Confirmed services:
  - Prometheus
  - Grafana
  - logging/export-related components
  - Tailscale
  - Twingate
  - Home Assistant
  - Nginx reverse proxy
- Primary responsibilities:
  - observability
  - remote access support
  - internal service routing
  - home automation

## Main Server

- Host type: primary application and storage host
- Deployment model:
  - Docker Compose
  - supporting automation scripts
- Confirmed services:
  - Jellyfin
  - Nextcloud
  - AudioBookShelf
  - Paperless or related document workflow service
  - node_exporter
  - additional self-hosted application services
- Primary responsibilities:
  - user-facing applications
  - media workloads
  - storage-backed self-hosted services

## DNS Node

- Host type: Raspberry Pi
- Confirmed service:
  - Pi-hole
- Primary responsibilities:
  - DNS filtering
  - forwarding DNS requests to Unbound on OPNsense

## Repository Coverage

The current repository directly represents the following areas:

### Application Service Configs

Under [`services/`](/Users/iansh/Desktop/Devops-experience/homeserver/homeserver_public/services):

- AudioBookShelf
- Heimdall
- Jellyfin
- Navidrome
- Nextcloud
- Portainer
- qBittorrent
- Uptime Kuma
- Yacht

These directories primarily contain Docker Compose definitions. A few directories also contain experimental or exploratory files that reflect ideas the lab may grow into later.

### Platform Configs

Under [`platform/`](/Users/iansh/Desktop/Devops-experience/homeserver/homeserver_public/platform):

- Unbound configuration and container assets
- exploratory GitOps-related files kept for reference, not as the main active deployment path

### Operational Helpers

Under [`ops/scripts/`](/Users/iansh/Desktop/Devops-experience/homeserver/homeserver_public/ops/scripts):

- file movement / helper automation scripts used to support service workflows

## Service Ownership Pattern

The repository is intentionally organized around service ownership.

- each application gets its own folder
- charts and service-specific manifests live with the service that owns them
- shared infrastructure stays under `platform/`
- miscellaneous helper automation stays under `ops/`

This keeps the repo understandable for both personal operations and public portfolio use.

## Notes And Documentation Gaps

Some services confirmed to be running in the homelab are not yet fully represented in this repository as first-class documented components. That is expected for now.

Areas to document more fully over time:

- complete live service inventory for the Main Server
- exact reverse proxy routing map
- metrics exporters and scrape targets
- backup responsibilities by node
- remote access path by service
