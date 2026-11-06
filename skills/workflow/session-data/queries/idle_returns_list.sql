-- 闲置回来的请求逐条：时间、间隔、上下文、首 token、缓存读写
-- param gap_min=60
-- param model=%
WITH q AS (
 SELECT r.*, (r.ts - coalesce(r.ms, 0) - LAG(r.ts) OVER (PARTITION BY r.session ORDER BY r.ts)) / 60000.0 AS gap_min
 FROM requests r WHERE r.session IS NOT NULL)
SELECT datetime(q.ts / 1000, 'unixepoch', 'localtime') AS at, CASE coalesce(s.sub, 0) WHEN 0 THEN '主' ELSE '子' END AS kind, q.session, round(q.gap_min) AS gap_min,
 coalesce(q.served, q.model) AS model, q.ctx, q.ttft_ms, q.cache_read, q.cache_write, q.cache_write_1h
FROM q LEFT JOIN sessions s ON s.id = q.file_id
WHERE q.gap_min > $gap_min AND q.ts >= $since_ms AND q.ts < $until_ms AND coalesce(q.served, q.model) LIKE $model
ORDER BY q.ts;
