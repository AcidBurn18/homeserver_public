# Wake-on-LAN Across VLANs with Home Assistant and OPNsense

A homelab setup for controlling physical servers from Home Assistant when the servers and Home Assistant are on different VLANs.

The main idea is simple:

> **Don't try to route a Wake-on-LAN broadcast across VLANs. Let OPNsense generate the WoL broadcast locally on the server VLAN.**

## Architecture

```text
                         VLAN A
                  ┌──────────────────┐
                  │  Home Assistant  │
                  │  192.168.B.11    │
                  └────────┬─────────┘
                           │
                           │ HTTPS / REST API
                           ▼
                  ┌──────────────────┐
                  │     OPNsense     │
                  │                  │
                  │    WoL Plugin    │
                  └────────┬─────────┘
                           │
                           │ Local WoL broadcast
                           ▼
                         VLAN B
                           │
                  ┌────────┴────────┐
                  │                 │
                  ▼                 ▼
           Main Server         HP Node 01
           192.168.B.2        192.168.B.9     
```

## Why VLANs break traditional WoL

Wake-on-LAN commonly uses a Layer-2 broadcast such as:

```text
192.168.B.255
```

That broadcast belongs to VLAN 30.

A router can route normal unicast traffic:

```text
192.168.A.11 → 192.168.B.2
```

but it does not normally forward Layer-2 broadcasts between VLANs.

Therefore this approach is problematic:

```text
Home Assistant
      │
      │ WoL broadcast
      ▼
   OPNsense
      │
      X
      │
   VLAN B
```

Instead, this project moves the source of the broadcast:

```text
Home Assistant
      │
      │ API request
      ▼
   OPNsense
      │
      │ Local WoL broadcast
      ▼
   VLAN B
```

## Power control flow

The Home Assistant switch represents the server's power state, but the ON and OFF operations use different mechanisms.

### Power ON

```text
Home Assistant
      │
      │ REST API
      ▼
   OPNsense
      │
      │ Wake-on-LAN
      ▼
   Server
```

### Power OFF

```text
Home Assistant
      │
      │ SSH
      ▼
   Server
      │
      │ sudo poweroff
      ▼
    OFF
```

This asymmetry is intentional. There is no requirement for ON and OFF to use the same mechanism.

## State detection

The switch state is based on whether the server is actually reachable.

```text
Server
   │
   │ ICMP / Ping
   ▼
Home Assistant Ping Sensor
   │
   ▼
Template Switch
   │
   ▼
Dashboard
```

This prevents the dashboard from simply assuming that the last ON/OFF command succeeded.

## Home Assistant configuration

The repository contains an example template switch:

```yaml
- switch:
    - name: "Main Server"
      unique_id: main_server_power

      state: >
        {{ is_state(
          'binary_sensor.computer_room_main_server',
          'on'
        ) }}

      turn_on:
        - action: rest_command.wake_mainserver

      turn_off:
        - action: shell_command.poweroff_mainserver
```

The same pattern can be used for additional servers.

## OPNsense API

The WoL plugin exposes the following endpoint:

```text
POST /api/wol/wol/set
```

A configured WoL host can be triggered using its UUID:

```json
{
  "uuid": "YOUR-WOL-HOST-UUID"
}
```

An example shell script is included for testing the OPNsense API independently of Home Assistant.

## Repository structure

```text
.
├── README.md
├── home-assistant/
│   ├── configuration.yaml.example
│   ├── template.yaml
│   └── dashboard.yaml

```

## Security

This repository intentionally contains placeholders instead of real credentials.

Do **not** commit:

* OPNsense API keys
* OPNsense API secrets
* SSH private keys
* real passwords
* production configuration containing sensitive information

Recommended setup:

```text
Home Assistant
      │
      │ HTTPS
      ▼
OPNsense Management API
```

Restrict access to the OPNsense API so that only the Home Assistant host can reach it.

Use a dedicated API credential rather than the OPNsense administrator credentials.

## What this project demonstrates

This setup is useful beyond Wake-on-LAN.

It demonstrates a general homelab networking principle:

> **When an operation depends on Layer-2 behaviour, don't automatically try to punch it through a Layer-3 boundary.**

Instead, consider moving the operation to a system that already exists on the correct network.

In this case:

```text
Bad approach:

HA → routed broadcast → Server VLAN


Better approach:

HA → API → OPNsense → local broadcast → Server
```

## Key takeaway

For a VLAN-segmented homelab:

**Route unicast traffic between VLANs. Keep broadcasts inside their VLAN whenever possible.**

That's the approach used in this project.
