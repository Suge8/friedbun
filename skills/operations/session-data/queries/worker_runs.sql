-- 各角色子代理的结果与运行时长（不含审查结局）
WITH f AS (SELECT id FROM sessions WHERE date >= $since AND ($until = '' OR date <= $until)),
x AS (
 SELECT coalesce((SELECT r.role FROM roles r WHERE r.file_id = e.file_id AND r.name = e.name AND r.pos < e.pos ORDER BY r.pos DESC LIMIT 1), '?') AS role,
  e.outcome, e.run_s
 FROM worker_events e JOIN f ON f.id = e.file_id WHERE e.outcome NOT LIKE '审查%' AND e.outcome NOT LIKE 'review %'),
r AS (SELECT role, outcome, run_s, row_number() OVER (PARTITION BY role, outcome ORDER BY run_s) AS rn, count(run_s) OVER (PARTITION BY role, outcome) AS timed FROM x)
SELECT role, outcome, (SELECT count(*) FROM x WHERE x.role = r.role AND x.outcome = r.outcome) AS n, max(timed) AS timed,
 printf('%.1f', max(CASE WHEN rn = CAST(timed * 0.5 AS INTEGER) + 1 THEN run_s END) / 60.0) AS p50_min,
 printf('%.1f', max(CASE WHEN rn = CAST(timed * 0.9 AS INTEGER) + 1 THEN run_s END) / 60.0) AS p90_min,
 printf('%.1f', coalesce(sum(run_s), 0) / 3600.0) AS hours
FROM r GROUP BY role, outcome ORDER BY role, n DESC;
