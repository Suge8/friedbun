-- 各角色 start 次数与每个子代理被审查次数分布
WITH f AS (SELECT id FROM sessions WHERE sub = 0 AND date >= $since AND ($until = '' OR date <= $until)),
per AS (
 SELECT file_id, name, count(*) AS reviews FROM worker_events WHERE outcome LIKE '审查%' OR outcome LIKE 'review %' GROUP BY file_id, name
 UNION ALL SELECT file_id, name, 0 FROM (SELECT DISTINCT file_id, name FROM roles WHERE name IS NOT NULL) d
  WHERE NOT EXISTS (SELECT 1 FROM worker_events e WHERE e.file_id = d.file_id AND e.name = d.name AND (e.outcome LIKE '审查%' OR e.outcome LIKE 'review %')))
SELECT 'start ' || role AS item, count(*) AS n FROM roles JOIN f ON f.id = file_id WHERE start = 1 GROUP BY role
UNION ALL SELECT '审查 ' || reviews || ' 次的子代理', count(*) FROM per JOIN f ON f.id = file_id GROUP BY reviews
ORDER BY 1;
