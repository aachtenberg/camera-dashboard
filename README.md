# Camera Dashboard

Unified live and gallery dashboard for ~5 cameras across Raspberry Pis.

## Overview
- **Live**: Multi-camera grid + per-camera page via HLS/LL-HLS (default) or WebRTC.
- **Gallery**: Motion-capture JPEGs from SFTP on Pi 2, indexed in PostgreSQL.
- **Infra**: Reuses Pi 1 Nginx Proxy Manager + Cloudflare Tunnel; analytics via Grafana Cloud.

## Non‑Negotiables
- Use `docker compose` (no hyphen). Validate with `docker compose config -q`.
- **Never commit `.env`**. Use `.env.example` for placeholders.
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`.

## Services
- **postgres**: Metadata store for cameras, events, and images.
- **api**: Node/Express; endpoints for cameras, events, images; health.
- **web**: Static SPA (grid, gallery, per-camera) served by Nginx.
- **mediamtx**: RTSP ingest; HLS/LL-HLS/WebRTC to browser.
- **sftp**: Receives JPEG uploads; writes to `/mnt/nas-backup/surveillance/captures`.

## File Structure
```
camera-dashboard/
  docker-compose.yml
  .env.example
  README.md
  api/
    Dockerfile
    package.json
    src/index.js
  web/
    Dockerfile
    public/index.html
    public/app.js
  streaming/
    mediamtx.yml
```

## Configure
- Create a local `.env` using `.env.example` as a guide.
- Ensure Pi 2 has `/mnt/nas-backup/surveillance/captures` mounted and writable.

## Try It (LAN-only)
- Build and run core services on Pi 2:
```bash
docker compose up -d postgres api web mediamtx sftp
```
- Access web UI on LAN (to be proxied by Pi 1 NPM): `http://<pi2-ip>:8081/`
- API health: `http://<pi2-ip>:8080/api/health`

## Pi 2 Reverse Proxy
- To keep Pi 1 untouched and route `/`, `/api/`, and `/streams/` locally on Pi 2, follow docs/pi2-reverse-proxy.md.
  - Option A: Dockerized Nginx on `:8089` (recommended)
  - Option B: System Nginx on `:80`
  - Later, point Pi 1 NPM at the single upstream (`raspberrypi2.local:8089` or `:80`).

## Plan & Checklist
- See the implementation plan: raspberry-pi-docker/docs/SURVEILLANCE_DASHBOARD_PLAN.md
- Phase 1–4: SFTP, DB+API, Web UI, Streaming; then NPM/Tunnel exposure.

## Notes
- DO NOT expose RTSP; publish only HTTP(S) via NPM/Tunnel.
- Prefer re-mux H.264→HLS to avoid transcoding load on Pi 2.
