-- 按实际服务模型汇总请求数与 token
SELECT coalesce(served, model) AS model, src, count(*) AS n, sum(in_tok) AS in_tok, sum(out_tok) AS out_tok, sum(cache_read) AS cache_read, sum(cache_write) AS cache_write,
 sum(cache_write_1h) AS cache_write_1h, round(avg(ttft_ms) / 1000.0, 1) AS ttft_avg_s
FROM requests WHERE ts >= $since_ms AND ts < $until_ms GROUP BY 1, 2 ORDER BY n DESC;
