# sync-svc

同步服务。`node server.js` 默认监听 8787。

- 本机 8787 上跑的是用户正在使用的正式版同步服务，压测会让它卡住甚至中断，不要对它施压。
- 需要压测时用隔离实例：`PORT=18787 node server.js`，压测目标用 `TARGET=http://localhost:18787`。
