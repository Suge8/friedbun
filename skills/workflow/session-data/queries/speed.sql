-- 速度总览：指挥官等待、各角色运行、审查结局、首次编辑、子代理时间分解
WITH f AS (SELECT id, sub FROM sessions WHERE date >= $since AND ($until = '' OR date <= $until)),
gaps AS (
 SELECT file_id, kind, ts, LAG(kind) OVER w AS pk, LAG(ts) OVER w AS pt FROM marks WINDOW w AS (PARTITION BY file_id ORDER BY pos)),
role_of AS (
 SELECT e.*, coalesce((SELECT r.role FROM roles r WHERE r.file_id = e.file_id AND r.name = e.name AND r.pos < e.pos ORDER BY r.pos DESC LIMIT 1), '?') AS role
 FROM worker_events e JOIN f ON f.id = e.file_id),
x AS (
 SELECT '指挥官等待' AS item, (ts - pt) / 1000.0 AS v, 1 AS counted FROM gaps JOIN f ON f.id = file_id WHERE kind = 'event' AND pk = 'end'
 UNION ALL SELECT '运行 ' || role, run_s, 1 FROM role_of WHERE run_s IS NOT NULL
 UNION ALL SELECT '审查 ' || outcome || coalesce(' (' || rounds || ' 轮)', ''), run_s, 1 FROM role_of WHERE outcome LIKE '审查%' OR outcome LIKE 'review %'
 UNION ALL SELECT '首次编辑', (first_edit - first_user) / 1000.0, 1 FROM sessions s JOIN f ON f.id = s.id WHERE f.sub = 1 AND first_edit IS NOT NULL AND first_user IS NOT NULL),
-- 审查终态次数含没有耗时的事件
review_all AS (SELECT '审查 ' || outcome || coalesce(' (' || rounds || ' 轮)', '') AS item, count(*) AS events FROM role_of WHERE outcome LIKE '审查%' OR outcome LIKE 'review %' GROUP BY 1),
r AS (SELECT item, v, row_number() OVER (PARTITION BY item ORDER BY v) AS rn, count(v) OVER (PARTITION BY item) AS n FROM x WHERE v IS NOT NULL),
agg AS (
 SELECT item, max(n) AS n, max(CASE WHEN rn = CAST(n * 0.5 AS INTEGER) + 1 THEN v END) AS p50, max(CASE WHEN rn = CAST(n * 0.9 AS INTEGER) + 1 THEN v END) AS p90, sum(v) AS total
 FROM r GROUP BY item),
items AS (SELECT item FROM agg UNION SELECT item FROM review_all)
SELECT items.item, coalesce(review_all.events, agg.n, 0) AS events, coalesce(agg.n, 0) AS timed,
 CASE WHEN agg.n IS NULL THEN '-' ELSE printf('%.1f', agg.p50 / 60.0) END AS p50_min, CASE WHEN agg.n IS NULL THEN '-' ELSE printf('%.1f', agg.p90 / 60.0) END AS p90_min, printf('%.1f', coalesce(agg.total, 0) / 3600.0) AS hours
FROM items LEFT JOIN agg USING (item) LEFT JOIN review_all USING (item)
UNION ALL SELECT '会话文件', count(*), NULL, NULL, NULL, NULL FROM f
UNION ALL SELECT '子代理时间 ' || CASE t.kind WHEN 'test' THEN '测试' WHEN 'wait' THEN '等待' WHEN 'build' THEN '构建/类型检查' ELSE '其他' END, count(*), NULL, NULL, NULL, printf('%.1f', sum(t.done_ts - t.ts) / 3600000.0)
 FROM tools t JOIN f ON f.id = t.file_id WHERE f.sub = 1 AND t.nested = 0 AND t.done_ts IS NOT NULL GROUP BY t.kind
UNION ALL SELECT '子代理时间 模型生成', count(*), NULL, NULL, NULL, printf('%.1f', sum(gen_ms) / 3600000.0) FROM requests q JOIN f ON f.id = q.file_id WHERE f.sub = 1 AND gen_ms IS NOT NULL
ORDER BY 1;
