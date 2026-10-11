import { Config } from "@remotion/cli/config";

// @remotion/effects 的 WebGL 特效要 ANGLE 才能渲染
Config.setChromiumOpenGlRenderer("angle");
// 重渲同名文件时直接覆盖，避免查看的是旧文件
Config.setOverwriteOutput(true);
// 默认并发是一半 CPU 核，竖版大画面会让 Chrome 内存不足而中途失败
Config.setConcurrency(4);
