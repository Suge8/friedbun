-- 按距上一个请求的间隔分桶：请求数、缓存读比例、首 token、1 小时档写入占比
-- param model=%
WITH q AS (
 SELECT r.*, (r.ts - coalesce(r.ms, 0) - LAG(r.ts) OVER (PARTITION BY r.session ORDER BY r.ts)) / 60000.0 AS gap_min
 FROM requests r WHERE r.session IS NOT NULL)
SELECT CASE WHEN gap_min IS NULL THEN '0 首个请求' WHEN gap_min < 5 THEN '1 <5 分钟' WHEN gap_min < 30 THEN '2 5–30 分钟' WHEN gap_min < 60 THEN '3 30–60 分钟' ELSE '4 >60 分钟' END AS gap_bucket,
 count(*) AS n, round(1.0 * sum(cache_read) / nullif(sum(ctx), 0), 3) AS cache_read_ratio, round(avg(ttft_ms) / 1000.0, 1) AS ttft_avg_s,
 sum(cache_write) AS cache_write, round(1.0 * sum(cache_write_1h) / nullif(sum(cache_write), 0), 3) AS write_1h_share
FROM q WHERE ts >= $since_ms AND ts < $until_ms AND coalesce(served, model) LIKE $model
GROUP BY 1 ORDER BY 1;
