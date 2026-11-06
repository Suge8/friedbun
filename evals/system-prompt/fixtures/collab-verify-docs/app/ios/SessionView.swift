// iOS 会话页
struct SessionView: View {
  var body: some View {
    VStack {
      RunningBadge(elapsed: Date().timeIntervalSince(localStartedAt)) // 运行中时间：用本机收到消息的时刻起算，不是服务端开始时刻
      Transcript()
      SentLog(items: sent) // 底部：已发送记录，和 Transcript 里的用户消息重复显示
    }
  }
}
