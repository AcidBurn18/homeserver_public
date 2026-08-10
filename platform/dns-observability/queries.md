# DNS Observability Queries (sanitized)

This file holds the implementation-side query snippets for the DNS observability build.
Keep the Medium article readable and move the exact query details here.

## Loki / AdGuard

Raw logs:

```logql
{job="adguard"}
```

Total queries:

```logql
sum(count_over_time({job="adguard"}[$__range]))
```

Blocked queries:

```logql
sum(
  count_over_time(
    {job="adguard"} !~ `"Result":\s*\{\s*\}`
    [$__range]
  )
)
```

Allowed queries:

```logql
sum(
  count_over_time(
    {job="adguard"} |~ `"Result":\s*\{\s*\}`
    [$__range]
  )
)
```

Cache hits:

```logql
sum(
  count_over_time(
    {job="adguard"}
    |~ `"Result":\s*\{\s*\}`
    |~ `"Cached":\s*true`
    [$__range]
  )
)
```

Forwarded / non-cached:

```logql
sum(
  count_over_time(
    {job="adguard"}
    |~ `"Result":\s*\{\s*\}`
    !~ `"Cached":\s*true`
    [$__range]
  )
)
```

Top blocked domains:

```logql
topk(20,
  sum by(domain) (
    count_over_time(
      {job="adguard"}
      !~ `"Result":\s*\{\s*\}`
      | regexp `"QH":\s*"(?P<domain>[^"]+)"`
      [$__range]
    )
  )
)
```

Top blocked clients:

```logql
topk(20,
  sum by(client) (
    count_over_time(
      {job="adguard"}
      !~ `"Result":\s*\{\s*\}`
      | regexp `"IP":\s*"(?P<client>[^"]+)"`
      [$__range]
    )
  )
)
```

## Loki / Unbound syslog

Use a narrow time range when exploring.
Do not group on both domain and client over long windows.

Example parse pattern:

```logql
{dns="reply"}
|~ " query: "
| regexp "query: (?P<client>[0-9.]+) (?P<domain>[^ ]+) (?P<qtype>[^ ]+) (?P<qclass>[^ ]+)"
```

Safer table view:

```logql
{dns="reply"}
|~ " query: "
!= "query: <replace-with-adguard-ip> "
| regexp "query: (?P<client>[0-9.]+) (?P<domain>[^ ]+) (?P<qtype>[^ ]+) (?P<qclass>[^ ]+)"
| line_format "client=\"{{.client}}\" domain=\"{{.domain}}\" type=\"{{.qtype}}\""
```

## Prometheus / Unbound

Total queries:

```promql
unbound_total_num_queries
```

Cache hits:

```promql
increase(unbound_total_num_cachehits[$__range])
```

Cache misses:

```promql
increase(unbound_total_num_cachemiss[$__range])
```

Cache hit percentage:

```promql
100 *
increase(unbound_total_num_cachehits[$__range]) /
(
  increase(unbound_total_num_cachehits[$__range]) +
  increase(unbound_total_num_cachemiss[$__range])
)
```

Recursion time:

```promql
unbound_total_recursion_time_avg * 1000
```

Uptime:

```promql
unbound_time_up
```

## Sankey panel ordering

Keep query order stable:

- A = AdGuard Total
- B = AdGuard Blocked
- C = AdGuard Allowed
- D = AdGuard Cache Hit
- E = AdGuard Forwarded / Non-Cached
- F = Unbound Cache Hits Raw
- G = Unbound Cache Miss Raw
- H = Avg Recursion ms

If the order changes, the JavaScript panel logic will read the wrong values.

## Cardinality warning

Avoid:

- domain as a long-term label
- domain + client grouping over broad windows
- wide-range parsing with lots of unique domains
- trying to force `topk()` to hide an already-expensive base query

Prefer:

- short windows
- table views for inspection
- query-time parsing
- one grouping dimension at a time
