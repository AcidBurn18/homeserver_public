# Building a Backup Strategy That Actually Feels Like Disaster Recovery in My Homelab

## TL;DR

I did not set out to build a full disaster recovery system. I started with a simple question: how do I make sure my Proxmox VMs and containers are backed up somewhere sane?

That answer turned into a much larger design:
- NFS-backed backup storage on a separate Ubuntu server
- Proxmox backup jobs with snapshot mode
- A retention policy that balances fast rollback and historical recovery
- Native Proxmox notifications instead of custom hook scripts
- Monthly health reports generated as JSON so they can feed Telegram, email, PDF, or dashboards later

What made this project interesting was not the backup job itself. It was the moment I realized a backup without retention, visibility, and restore confidence is just a copy of data sitting somewhere.

---

## Why this started as a backup problem and became a DR problem

The original ask was simple: need backups.

But once I started thinking like an operator, that stopped being enough. A real recovery workflow needs more than a nightly snapshot. It needs:
- retention
- monitoring
- reporting
- notifications
- and eventually, restore testing

That shift changed the whole design.

Instead of treating backups as the end state, I treated them as one piece of a larger recovery system.

---

## The infrastructure I was working with

The homelab was split across Proxmox hosts and an Ubuntu storage server. The storage server already had a RAID1 HDD array and exported a backup path for the rest of the environment.

The final backup storage ended up mounted in Proxmox as:

```text
/mnt/pve/homelab-backups/
```

That name mattered less than the shape of the setup: the backup target was not local to the VM host, and it was not something I wanted to manage manually.

---

## Why I chose NFS over everything else

I looked at a few options before settling on NFS.

Local storage was the obvious non-starter. If the host dies, the backups die with it.

USB was cheap, but too manual.

SMB worked in theory, but it added Windows-oriented complexity to an environment that is otherwise Linux from one end to the other.

NFS was the clean fit:
- native on Linux
- simple export and mount model
- easy integration with Proxmox
- fewer layers between the backup job and the storage target

That was enough for me.

The storage server export was straightforward:

```bash
sudo apt install nfs-kernel-server
```

Then I exported the backup path to the homelab network, reloaded exports, and verified that Proxmox could see it.

The important lesson here was boring but real: if you change exports and forget to refresh them, the client side will make you think something is broken when the issue is just stale export state.

---

## The backup job itself was the easy part

Once the NFS storage was mounted in Proxmox, the backup job was almost trivial.

I configured a Datacenter-level backup job for the relevant VMs and containers, used snapshot mode, and pointed it at the NFS-backed storage target.

The retention policy was the more interesting part:
- keep-last=2
- keep-weekly=8
- keep-monthly=12

I did not want a giant pile of backups, and I did not want only the latest copy either.

This gave me:
- fast rollback for recent mistakes
- weekly history for medium-term recovery
- monthly history for longer-term recovery points

That felt like the right balance for the amount of storage I actually had.

---

## Why native Proxmox notifications won over custom hook scripts

At one point, I was heading toward a custom backup hook script, a webhook, n8n, and then Telegram.

That path would have worked. It also would have given me more code to own for no real gain.

Proxmox already has notification targets built in.

That changed the architecture immediately:
- backup execution stays inside Proxmox
- notification delivery stays native
- n8n becomes the presentation/integration layer, not the backup engine

That separation felt much cleaner.

It also avoided the classic homelab trap of building a small workflow engine just to send a message.

---

## The monthly reporting layer is where it became useful

The backup job was only part of the story. The real operational value came from the monthly reporting pipeline.

I built a small shell-based health reporting flow that collected system and disk information, then rolled it up into structured JSON.

That JSON-first decision mattered.

I did not want a shell script that only knew how to print one Telegram message.
I wanted a report format that could be reused by:
- Telegram
- email
- PDF reports
- dashboards
- future comparisons
- and maybe even AI summaries later

That is the difference between a one-off script and a durable reporting contract.

---

## What the reporting pipeline looked like

The flow ended up looking like this:

```text
system checks -> logs -> monthly JSON -> archive -> latest.json -> n8n -> Telegram
```

The shell side gathered the raw signal.
The JSON file became the durable record.
And the consumer layer handled the human formatting.

That split kept the system sane.

It also made the reporting layer much easier to extend later without changing the data collection step.

---

## The most educational failure: a stale Proxmox backup lock

The best debugging lesson in the whole project had nothing to do with NFS.
It was a Proxmox lock issue.

A VM showed:

```text
VM is locked (backup)
```

My first instinct was to assume the backup itself was broken.
That would have been the wrong conclusion.

Before touching anything, I checked whether a vzdump process was actually running. It was not.

Then I checked the VM config and found a stale backup lock.

The fix was simple:

```bash
qm unlock <vmid>
```

But only after verifying that no backup job was actively running.

That part matters.
You do not want to clear locks blindly just because the message is annoying.

The real lesson: always separate a stale state problem from an active process problem.

---

## What changed in how I think about backups

This project changed my mental model in a few useful ways.

I now think about backups as a chain, not a single action:
- copy the data
- keep the right history
- monitor the system that holds the copies
- report on the system regularly
- notify on failures or completion
- verify that restore is actually possible

That is closer to disaster recovery than backup in the narrow sense.

And that is exactly what I wanted.

---

## What I would keep if I were doing this again

I would keep the same core architecture:
- NFS for storage
- Proxmox-native backups
- Proxmox notifications instead of custom hook glue
- JSON as the report contract
- n8n as the notification and formatting layer

I would also keep the retention policy nearly as-is.
It is simple enough to operate, and it gives enough recovery depth to matter.

The only thing I would add next is a real restore test loop.
Backups are only as good as the last restore you actually validated.

---

## Final result

What I ended up with is not just a backup target.
It is a recovery system with storage, retention, notification, and reporting all separated into the right layers.

That structure feels more durable, easier to extend, and much easier to trust.

And in a homelab, trust is the real feature.

---

## Draft notes for the final polish pass

- Add a screenshot of the Proxmox backup job configuration
- Add a screenshot of the NFS storage entry in Proxmox
- Add a screenshot or sample of the monthly JSON report
- Consider turning the lock investigation into a short callout box
- If publishing to Medium, tighten the intro and keep the paragraphs slightly shorter

