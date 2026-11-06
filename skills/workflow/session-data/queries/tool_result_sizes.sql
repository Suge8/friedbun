-- 工具结果大小分布（字符数）
WITH x AS (
 SELECT name, chars, row_number() OVER (PARTITION BY name ORDER BY chars) AS rn, count(*) OVER (PARTITION BY name) AS n
 FROM tools WHERE nested = 0 AND chars IS NOT NULL AND ts >= $since_ms AND ts < $until_ms)
SELECT name, max(n) AS n,
 max(CASE WHEN rn = CAST(n * 0.5 AS INTEGER) + 1 THEN chars END) AS p50, max(CASE WHEN rn = CAST(n * 0.9 AS INTEGER) + 1 THEN chars END) AS p90,
 max(CASE WHEN rn = CAST(n * 0.99 AS INTEGER) + 1 THEN chars END) AS p99, max(chars) AS max, round(sum(chars) / 1e6, 1) AS total_mb
FROM x GROUP BY name ORDER BY total_mb DESC LIMIT 20;
