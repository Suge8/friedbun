// Android 会话页
@Composable fun SessionScreen() {
  Column {
    NotificationBar(progress = job.progress) // 顶部进度通知：progress 只在前台更新，切后台会停在旧值
    Transcript()
    Composer(draft)
  }
}
