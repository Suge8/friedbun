-- 压缩点明细：时间、压缩前 token、压缩调用自身的用量与花费
SELECT datetime(c.ts / 1000, 'unixepoch', 'localtime') AS at, CASE s.sub WHEN 0 THEN '主' ELSE '子' END AS kind, s.project, coalesce(s.name, '') AS name,
 c.tokens_before, c.in_tok, c.out_tok, c.cache_read, c.cache_write, round(c.cost, 3) AS cost_usd
FROM compactions c JOIN sessions s ON s.id = c.file_id
WHERE c.ts >= $since_ms AND c.ts < $until_ms
ORDER BY c.ts;
