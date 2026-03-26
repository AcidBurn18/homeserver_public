# 🏠 Self-Hosted DevOps Home Server

## Overview

This repository contains the configuration and setup of my self-hosted home server, where I run and manage multiple services using Docker.

The goal of this project is to simulate a real-world DevOps environment focusing on containerization, networking, and service reliability.

---

## 🚀 What This Project Demonstrates

* Running production-like workloads on a self-hosted server
* Managing multiple containerized services
* Networking and service isolation
* Practical DevOps experimentation outside cloud environments

---

## 🧱 Tech Stack

* Docker & Docker Compose
* Linux (Ubuntu Server)
* Custom DNS (Pi-hole + Unbound)
* Reverse Proxy (if used: Nginx / Traefik)
* Networking & Routing concepts
* Proxmox (virtualization layer)

---

## 📦 Services Running

* Media Server (Jellyfin)
* Personal Cloud (Nextcloud)
* DNS Server (Pi-hole + Unbound)
* Additional containers for experimentation

---

## 🏗️ Architecture (High-Level)

* Proxmox host running virtualized environments
* Docker containers for each service
* Services exposed via internal network
* DNS-based routing within the network
* Persistent storage using mounted volumes

---

## ⚙️ Key Features

* Modular Docker Compose setups per service
* Isolated service environments
* Self-managed networking and DNS resolution
* Hands-on infrastructure management

---

## 📂 Repository Structure

```
/services
  /jellyfin
  /nextcloud
  /dns
/docker-compose.yml
```

---

## 🔐 Security & Privacy

All sensitive configurations, secrets, and internal network details have been removed or generalized.

---

## 📈 Future Improvements

* Implement CI/CD for automated deployments
* Add monitoring (Prometheus + Grafana)
* Centralized logging (Loki stack)
* Kubernetes migration for orchestration

---

## ✍️ Related Articles

I also document my learnings and setup in detail on Medium:
👉 https://teckdebate.medium.com

---

## 📌 Disclaimer

This is a personal project built for learning and experimentation.
It reflects real-world DevOps practices in a home lab environment.
