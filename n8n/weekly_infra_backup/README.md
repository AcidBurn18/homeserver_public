# Proxmox Backup Notifications — n8n + Telegram

This n8n workflow receives backup events from Proxmox and sends **success/failure notifications to Telegram**.

## Import

1. Download `Weekly Infrastructure Backup.json`.
2. Open **n8n → Workflows**.
3. Import the JSON file.
4. Keep the workflow **inactive** until the configuration below is complete.

## Required Configuration

### 1. Configure Telegram Credentials

Open both Telegram nodes:

* `Promox Host Backup Message`
* `Proxmox Container Backup Message`

Select **Credential → Create New** and configure your Telegram Bot API token.

> The public JSON does **not** contain any Telegram bot credentials.

### 2. Add Your Telegram Chat ID

In both Telegram nodes, replace:

```text
YOUR_TELEGRAM_CHAT_ID
```

with your actual Telegram Chat ID.

### 3. Activate the Workflow

After configuring Telegram, save and **activate the workflow**.

The webhook endpoint used by the workflow is:

```text
POST /webhook/homelab/events
```

Your complete URL will look similar to:

```text
http://YOUR_N8N_IP:5678/webhook/homelab/events
```

Use this URL as the notification/webhook target for your Proxmox backup scripts.

## Security

No Telegram bot token, password, API key, or other authentication secret is included in this template.

Never commit your configured Telegram Bot Token or other credentials to a public repository.

---

Built for homelabs. Modify it, break it, improve it. 🙂
