-- 闲置回来的请求汇总：上下文、首 token、缓存读写；按主 / 子分
-- param gap_min=60
-- param model=%
WITH q AS (
 SELECT r.*, (r.ts - coalesce(r.ms, 0) - LAG(r.ts) OVER (PARTITION BY r.session ORDER BY r.ts)) / 60000.0 AS gap_min
 FROM requests r WHERE r.session IS NOT NULL),
x AS (
 SELECT coalesce(s.sub, 2) AS sub, q.*, row_number() OVER (PARTITION BY coalesce(s.sub, 2) ORDER BY q.ctx) AS rn, count(*) OVER (PARTITION BY coalesce(s.sub, 2)) AS n
 FROM q LEFT JOIN sessions s ON s.id = q.file_id
 WHERE q.gap_min > $gap_min AND q.ts >= $since_ms AND q.ts < $until_ms AND coalesce(q.served, q.model) LIKE $model)
SELECT CASE sub WHEN 0 THEN '主' WHEN 1 THEN '子' ELSE '无会话文件' END AS kind, max(n) AS n,
 max(CASE WHEN rn = CAST(n * 0.5 AS INTEGER) + 1 THEN ctx END) AS ctx_p50, max(ctx) AS ctx_max,
 round(avg(ttft_ms) / 1000.0, 1) AS ttft_avg_s, count(ttft_ms) AS ttft_n,
 sum(cache_write) AS cache_write, sum(cache_write_1h) AS cache_write_1h, sum(cache_read) AS cache_read,
 round(1.0 * sum(cache_read) / sum(ctx), 3) AS cache_read_ratio
FROM x GROUP BY sub;
