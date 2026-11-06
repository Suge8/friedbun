-- 压缩次数与花费：主会话 / 子代理的次数、压缩前 token 分布、合计与单次花费
WITH x AS (
 SELECT s.sub, c.tokens_before AS tb, c.cost, row_number() OVER (PARTITION BY s.sub ORDER BY c.tokens_before) AS rn, count(*) OVER (PARTITION BY s.sub) AS n
 FROM compactions c JOIN sessions s ON s.id = c.file_id WHERE c.ts >= $since_ms AND c.ts < $until_ms)
SELECT CASE sub WHEN 0 THEN '主会话' ELSE '子代理' END AS kind, max(n) AS n, min(tb) AS tb_min,
 max(CASE WHEN rn = CAST(n * 0.5 AS INTEGER) + 1 THEN tb END) AS tb_p50, max(tb) AS tb_max,
 round(sum(cost), 2) AS cost_usd, round(avg(cost), 3) AS cost_avg
FROM x GROUP BY sub
UNION ALL SELECT '合计', count(*), NULL, NULL, NULL, round(sum(c.cost), 2), round(avg(c.cost), 3) FROM compactions c WHERE c.ts >= $since_ms AND c.ts < $until_ms;
