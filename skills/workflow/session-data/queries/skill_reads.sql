-- 每个技能 SKILL.md 被读次数（含 codemode 内嵌套）
-- param since=30d
SELECT replace(d, rtrim(d, replace(d, '/', '')), '') AS skill, count(*) AS reads, count(DISTINCT file_id) AS sessions,
 datetime(max(ts) / 1000, 'unixepoch', 'localtime') AS last_read
FROM (SELECT replace(path, '/SKILL.md', '') AS d, file_id, ts FROM tools WHERE path LIKE '%/SKILL.md' AND ts >= $since_ms AND ts < $until_ms)
GROUP BY skill ORDER BY reads DESC;
