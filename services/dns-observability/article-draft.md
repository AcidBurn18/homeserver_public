
# DNS Observability in My Homelab: AdGuard, Unbound, Loki, and the Flow I Finally Wanted to See

## TL;DR

I wanted one clean view of DNS in my homelab, not three separate tools pretending to tell the same story.

So I connected:
- AdGuard query logs into Loki
- OPNsense Unbound logs into Loki through remote syslog
- Unbound metrics into Prometheus
- Grafana into a single flow view that shows what was blocked, cached, forwarded, and recursively resolved

The biggest lessons were not glamorous:
- DNS logs are high-cardinality and will punish lazy Loki queries
- AdGuard cache hits can still show an upstream resolver field
- syslog filter choices can make a working path look broken
- Docker bind mounts only work when the file exists on the host running the container

That sounds simple after the fact, but it took a few wrong turns to get there.

---

## Why I built this

I already had DNS components working in the homelab, but I did not have a single, trustworthy view of the full path.

I could see individual pieces:
- AdGuard could block or forward queries
- Unbound could resolve and cache
- OPNsense could log resolver activity
- Prometheus could expose health metrics

But none of that alone answered the question I actually cared about:

What does the DNS path look like end to end when a client makes a request?

That is the gap this setup closes.

---

## The architecture I ended up with

The final shape is simple, even if the journey wasn’t.

Client devices send DNS queries to AdGuard.
AdGuard decides whether the request is blocked, answered from cache, or forwarded.
Forwarded requests go to Unbound on OPNsense.
Unbound either answers from cache or recurses upstream.

For observability, I split the data by job:

- AdGuard querylog.json → Promtail → Loki → Grafana
- OPNsense Unbound logs → remote syslog → Promtail receiver → Loki → Grafana
- Unbound metrics → Prometheus → Grafana

That split matters because logs and metrics are answering different questions.

Logs show behavior.
Metrics show health.

---

## Why I did not try to make one exporter solve everything

I could have gone hunting for a single exporter and tried to normalize the whole stack into Prometheus.

I did not want that.

For AdGuard, the safer path was to read the query log directly.
For Unbound, metrics were already the right fit.
For OPNsense, the cleanest option was to ship the resolver logs out through syslog.

That gave me a setup that is closer to the way the system actually behaves instead of forcing everything into one measurement model.

---

## The first problem: syslog looked fine until it didn’t

The first real debugging moment was the OPNsense syslog path.

At a glance, everything looked right:
- destination host was correct
- port was correct
- Promtail had a syslog receiver
- the network path was open

But the logs still did not show up the way I expected.

The lesson was annoyingly simple: the logging filter selection in OPNsense mattered more than I thought.

When I broadened the log levels, packets started to appear.
That told me the network path was fine.
The problem was not transport.
The problem was selection.

That is a good example of why DNS observability work often feels like infrastructure work plus detective work.

---

## The second problem: Loki punished the obvious query shape

This was the part that made the whole build feel real.

DNS logs are naturally high-cardinality.
Every domain, every client, every time window can explode into too many series if you group carelessly.

I hit the classic error:

> maximum number of series (500) reached for a single query

The mistake was trying to group by both domain and client over long ranges.
That looks reasonable until Loki has to materialize all those intermediate series.
Even wrapping it in `topk()` does not save you if the base grouping is already too expensive.

That forced me to change the way I thought about the dashboard:

- use shorter windows for log exploration
- use table views for recent data
- group by one dimension at a time when possible
- parse fields at query time instead of turning everything into permanent labels

That is probably the most useful lesson in the entire project.

---

## AdGuard was the other surprise

AdGuard query logs looked straightforward at first.

Each entry gives you the query, the client, the upstream, and the result.
That sounds easy until you notice one subtle thing:

A cached AdGuard query can still include an upstream field.

That means you cannot treat `Upstream` as proof that the request was forwarded.
A cached query may still carry upstream information in the log record.

So I had to classify cache hits explicitly instead of assuming the absence of upstream.
That one detail changes the way you build the queries and the Sankey panel.

---

## Why the query log path had to be exact

There was another practical gotcha here.

If you point Promtail at a wildcard path like `querylog.json*`, you also pull in rotated logs.
That sounds harmless until ingestion spikes, backfill starts, and Loki starts pushing back with rate limits.

I hit the equivalent of a quiet self-inflicted DDoS on the ingestion side.

The fix was to ingest only the active file.
No wildcard.
No accidental backfill of rotated logs.

This is the kind of detail that feels minor in a note and becomes major in production.

---

## How I split the dashboard logic

Once the data sources were working, I wanted a dashboard that was not just a pile of panels.

The goal was to make the DNS path visible.

The Sankey panel became the best fit because it lets me express flow:

- clients to AdGuard
- AdGuard to blocked
- AdGuard to cache hit
- AdGuard to forwarded
- forwarded to Unbound
- Unbound to cache hit
- Unbound to cache miss
- cache miss to recursive DNS

That is the story I wanted the dashboard to tell.

Not just “queries happened,” but “this is where they went.”

[Insert screenshot here: full Grafana dashboard with DNS flow Sankey]

---

## The tricky part: making the Sankey believable

A Sankey chart wants balanced flow.
Real telemetry rarely gives you perfect balance across different tools and measurement windows.

That is normal.

AdGuard logs and Unbound metrics do not live in the same temporal model.
Logs are event-driven.
Metrics are scrape-driven.
The time windows are similar, but not identical.

So instead of pretending the raw numbers would line up perfectly, I normalized the Unbound hit/miss values against the forwarded count.
That preserved the ratio while keeping the visual flow sensible.

That is the kind of compromise I actually trust in a homelab dashboard.
It is honest about the data, but still useful.

---

## What I like about the final result

The best part is not the chart itself.
It is the way the chart answers questions fast.

Now I can see:
- whether AdGuard is blocking a lot of traffic
- whether queries are getting served from cache
- whether forwarded traffic is expensive
- whether Unbound is healthy
- whether recursion latency is trending up

That is more useful than a generic “DNS is up” green light.

It gives me a live operator view of the system.

[Insert screenshot here: Unbound metrics panel]
[Insert screenshot here: Loki query table showing parsed AdGuard query log]

---

## What I would keep on GitHub versus in the article

This part matters if you want the Medium post to stay readable.

I would keep the following on GitHub:
- raw LogQL and PromQL snippets
- Promtail config fragments
- any dashboard export files
- troubleshooting notes
- screenshot filenames and placement notes
- exact verification commands

I would keep the following in the article:
- the story of the build
- the architecture explanation
- the key mistakes and fixes
- a few short query examples
- screenshots
- the operator lessons

That split keeps the article clean without hiding the implementation.

---

## The biggest lessons I would keep

If I had to boil this whole build down to a few honest lessons, it would be these:

1. DNS observability is not one problem.
   It is logs, metrics, and policy behavior all at once.

2. Loki is powerful, but it will not forgive high-cardinality thinking.

3. Cache behavior is easy to misread if you rely on one field only.

4. Remote logging is only as good as the filters you apply on the source side.

5. The best dashboards are the ones that match the way operators think during an incident.

That last one is what this project is really about.

---

## Final state

At the end of the build, I had a working path from:

- client query
- AdGuard policy decision
- forwarding into Unbound
- Unbound cache behavior
- recursive resolution latency
- dashboard visualization in Grafana

That is the observability layer I wanted from the beginning.

It is not perfect in the mathematical sense, but it is operationally honest.
And for a homelab, that is usually the better tradeoff.

---

## Closing note

This setup is now the foundation for future DNS security analysis too.

The next useful additions would be:
- bypass detection
- suspicious query patterns
- blocked-client trends
- NXDOMAIN or SERVFAIL spikes
- long random-looking domains
- external DNS attempt visibility from firewall logs

For now, though, the important thing is simpler:

I can finally see the DNS path instead of guessing at it.
