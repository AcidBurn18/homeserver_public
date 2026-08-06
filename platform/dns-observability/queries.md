# LogQL Queries for AdGuard

## DNS Observability Queries
This file contains sanitized implementation-side query snippets for the DNS observability build, ensuring all details are ready for easy replication by the end user.

### Loki / AdGuard Queries

- **Raw logs:**  
```logql  
{job="adguard"}  
```  

- **Total queries:**  
```logql  
sum(count_over_time({job="adguard"}[$__range]))  
```  

- **Blocked queries:**  
```logql  
sum(  
  count_over_time(  
    {job="adguard"} !~ `"Result":\s*\{\s*\}`  
    [$__range]  
  )  
)  
```  

- **Allowed queries:**  
```logql  
sum(  
  count_over_time(  
    {job="adguard"} |~ `"Result":\s*\{\s*\}`  
    [$__range]  
  )  
)  
```  

- **Cache hits:**  
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

- **Forwarded / non-cached:**  
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

- **Top blocked domains:**  
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

- **Top blocked clients:**  
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

### Metrics for Unbound Queries
- **Total queries:**
```promql
unbound_total_num_queries
```
- **Cache hits:**
```promql
increase(unbound_total_num_cachehits[$__range])
```
- **Cache misses:**
```promql
increase(unbound_total_num_cachemiss[$__range])
```
- **Cache hit percentage:**
```promql
100 *
increase(unbound_total_num_cachehits[$__range]) /
(
  increase(unbound_total_num_cachehits[$__range]) +
  increase(unbound_total_num_cachemiss[$__range])
)
```
- **Recursion time:**
```promql
unbound_total_recursion_time_avg * 1000
```
- **Uptime:**
```promql
unbound_time_up
```
