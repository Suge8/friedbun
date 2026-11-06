-- 各模型输出 token/秒（同 speed.ts 口径）
WITH x AS (
 SELECT coalesce(q.model, '?') AS model, q.out_tok * 1000.0 / q.gen_ms AS rate
 FROM requests q JOIN sessions s ON s.id = q.file_id
 WHERE s.date >= $since AND ($until = '' OR s.date <= $until) AND q.out_tok >= 300 AND q.gen_ms / 1000.0 > 1 AND q.gen_ms / 1000.0 < 600),
r AS (SELECT model, rate, row_number() OVER (PARTITION BY model ORDER BY rate) AS rn, count(*) OVER (PARTITION BY model) AS n FROM x)
SELECT model, max(n) AS n,
 printf('%.1f', max(CASE WHEN rn = CAST(n * 0.5 AS INTEGER) + 1 THEN rate END)) AS p50_tok_s,
 printf('%.1f', max(CASE WHEN rn = CAST(n * 0.9 AS INTEGER) + 1 THEN rate END)) AS p90_tok_s
FROM r GROUP BY model ORDER BY n DESC;
