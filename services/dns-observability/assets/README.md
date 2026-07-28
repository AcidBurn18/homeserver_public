# DNS Observability Assets

This folder is for the screenshot/export plan that supports the Medium article.

## Recommended screenshots

Create these exports or screenshots when you finalize the post:

- `sankey-dashboard.png`
  - Full Grafana dashboard showing the DNS flow Sankey
- `adguard-log-table.png`
  - Loki table view showing parsed AdGuard query log rows
- `unbound-metrics.png`
  - Prometheus/Grafana panel for cache hits, cache misses, recursion time, or query types
- `loki-cardinality-error.png`
  - The actual series-limit error message, if you want to include the troubleshooting story
- `syslog-validation.png`
  - tcpdump or Promtail receiver evidence showing the syslog path is active

## Suggested article placement

- Put the Sankey screenshot near the section where the final dashboard is introduced.
- Put the log table screenshot near the AdGuard explanation.
- Put the metrics screenshot near the Unbound section.
- Put the error screenshot near the Loki cardinality discussion.
- Put the syslog screenshot near the OPNsense remote logging section.

## Export notes

- Keep screenshots cropped to the relevant panel when possible.
- Hide sensitive hostnames, private IPs, and browser tabs.
- Prefer clean visuals over raw full-screen dumps.
- If a screenshot is too busy, use a callout box in the article instead.

## If you want to add diagrams later

You can also drop in:

- `architecture-diagram.svg`
- `dashboard-layout.png`
- `flow-explainer.png`

Those are optional, but useful if you want the article to feel more polished.
