# Homelab Architecture

This document describes the current homelab architecture represented by this repository. It is intentionally public-safe: sensitive values, private addresses beyond the generalized lab subnet, and access details are omitted or simplified.

The goal of this setup is to separate network control, infrastructure services, application workloads, and DNS responsibilities across different systems while keeping the environment practical for daily use.

## Architecture Goals

- separate firewall, infrastructure, application, and DNS roles
- operate a realistic self-hosted environment with multiple nodes
- support secure remote access without relying on direct public exposure
- keep the lab maintainable as more services and tooling are added
- evolve toward stronger observability and more mature platform workflows over time

## Physical Nodes

### Firewall Node

- Hardware: Hyscale mini PC
- Hypervisor: Proxmox
- Key workload: OPNsense VM
- Responsibility:
  - routing
  - firewall policy
  - internal gateway
  - upstream DNS recursion via Unbound

### Infra Node

- Hardware: Lenovo TS server
- Main role: support-plane and observability services
- Confirmed workloads:
  - Prometheus
  - Grafana
  - partial logging/exporter components
  - Tailscale
  - Twingate
  - Home Assistant
  - Nginx reverse proxy

### Main Server

- Role: primary workload host
- Deployment model: Docker Compose plus small operational helper scripts
- Storage:
  - 2 x 8 TB disks
  - RAID 1
  - approximately 4 TB in use
- Confirmed workload class:
  - media
  - storage and collaboration
  - document and personal services
  - exporters and operational tooling

### DNS Node

- Hardware: Raspberry Pi
- Main workload: Pi-hole
- Responsibility:
  - DNS filtering for the internal network
  - forwarding upstream requests to Unbound on OPNsense

## Network Topology

The current network is a single LAN design.

- Internal LAN: single private LAN subnet
- Central switching: one unmanaged switch
- Wireless: single SSID across access points
- Internet edge:
  - ISP router remains in front of OPNsense
  - OPNsense is not in bridge mode
  - environment operates behind double NAT
  - ISP also imposes CGNAT

### Logical Path

```text
Internet
  ^
  |
ISP / CGNAT
  ^
  |
ISP Router
  ^
  |
OPNsense VM on Firewall Node
  ^
  |
LAN Switch
  |------ Infra Node
  |------ Main Server
  |------ Raspberry Pi (Pi-hole)
  |------ Access Points
  |------ Clients
```

## DNS Flow

DNS in the lab follows this path:

```text
Client -> Pi-hole on Raspberry Pi -> Unbound on OPNsense -> Internet DNS resolution
```

This design keeps filtering and local DNS policy separate from the recursive upstream resolver.

## Access Model

The lab is designed around controlled remote access rather than broad direct public exposure.

- primary remote access methods:
  - Twingate
  - Tailscale
- services are typically accessed through those secure access layers
- Nginx reverse proxy exists on the Infra Node and supports internal service routing, but the exact publishing model is still being documented

## Observability Model

Observability is still in progress, but the support-plane direction is already visible.

- Prometheus provides metric collection
- Grafana provides dashboards and visualization
- exporter-based monitoring is present on at least part of the environment
- logging is partially implemented today
- planned direction includes a more complete centralized logging stack

## Current Architectural Shape

This homelab is best described as:

- node-role separated
- network-flat
- remote-access overlay oriented
- Docker Compose heavy
- gradually evolving toward broader platform discipline

In other words, the environment already reflects production-like separation of concerns at the compute and service layer, even though the network is currently a single-LAN design.

## Known Unknowns

The following areas are intentionally left as open documentation items until they are confirmed and written down more precisely:

- exact Twingate versus Tailscale role split
- exact service exposure path through Nginx
- full live service inventory on the Main Server
- backup and recovery workflow
- whether any historical AP or alternate interface topology is still active

As the homelab evolves, this document should be updated alongside the repository structure so the GitHub project stays accurate and credible.
