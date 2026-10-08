# 表单标注与反馈放置

在不让用户猜、不隐藏关键状态的前提下减少文字。判断依据是信息何时有用、用户在哪里处理，而不是更少的 DOM 节点。依据：W3C WAI 表单教程、GOV.UK 与 USWDS 表单模式、NN/g *Placeholders in Form Fields Are Harmful*、OWASP Authentication Cheat Sheet。「提交与 Toast 时机」中的标签页隐藏暂停一条吸收自 [emilkowalski/skills](https://github.com/emilkowalski/skills)（MIT，Copyright (c) 2026 Emil Kowalski）。

## 放置决策

| 信息 | 位置 | 持续时间 |
|---|---|---|
| 操作前必须知道的范围、例外或后果 | 控件 caption、分组说明；高风险操作用确认 Dialog | 操作前可见 |
| Toggle、选中态等控件已有明确终态 | 控件本身 | 状态存在期间 |
| 用户能在局部修复的输入错误 | 对应字段或字段组旁，`aria-invalid` + `aria-describedby` | 修复前保持 |
| 整个表单或一组凭据失败 | 表单内 Alert；长表单加错误摘要 | 解决前保持 |
| 用户改不了的系统或网络问题 | 区域 Banner 或表单内 Alert，字段保持常态 | 恢复或关闭前保持 |
| 无需处理的短暂操作结果 | Toast 或 `role="status"` | 短暂 |
| 不影响决策和任务完成的补充解释 | Tooltip、Toggletip 或帮助链接 | 按需 |

- 同一事实只选一个主要反馈通道。控件已经显示结果时不再 Toast；同一句错误不同时出现在 Toast 和字段旁。
- 长表单的错误摘要与字段错误分别承担导航和修复，属于必要重复。
- Tooltip 不承载错误、安全影响、不可逆后果或完成任务所需的信息；同时支持 hover、focus、Escape 和 touch。含交互内容时用 Toggletip/Popover。

## Toggle 与设置范围

先让设置名称准确，再考虑加说明。"邮件通知"实际只控制产品邮件时，优先写成：

```text
邮件
产品动态                         [开关]
安全提醒                         始终发送
```

不可调整的"安全提醒"用静态状态，不伪装成 disabled Toggle。信息架构不能改时，在开关旁保留短 caption（`aria-describedby` 关联）：

```text
邮件通知                         [开关]
安全提醒始终发送
```

切换成功由开关终态表达，不弹"已开启/已关闭"。异步保存失败时恢复最后确认的状态，并在该设置旁显示可重试错误；界面显示开启而服务端仍是关闭的状态不出现。

## Label、Placeholder 与图标

- Label 回答"填什么"，Placeholder 只给非必要的格式或示例；两者同义时保留 Label、删 Placeholder，空输入框是正常状态。必填、输入要求、安全说明和错误不写在 Placeholder 里；密码字段通常不要 Placeholder。
- 认证、地址、付款和多字段表单不用 visually hidden label 做视觉减法。只有目的从同屏上下文完全明确的单用途输入（紧邻搜索按钮的站内搜索）才可隐藏视觉 Label，仍保留程序化名称；用户名、当前密码、新密码、确认密码不属于例外。
- Leading icon 只辅助扫描，不承担字段名；没有明确收益时删掉用户名、锁等重复图标。显示密码、清空等可操作 trailing icon 是 Button，有准确 accessible name。
- 默认简短上置 Label：Label 与输入间距 4–8px，字段组之间 16–20px。Label 是控件文字，不做成第二级标题。
- 紧凑界面只复用项目现有、已验证的 floating-label 组件，真实 `<label>` 在 focus、已填、autofill、错误和恢复状态下都可见；不为省一行自行实现。
- 必填字段用原生 `required` 加可见标记，每个表单解释一次（"* 必填"）。
- 登录：标识符 `autocomplete="username"`，登录密码 `current-password`，注册或重置 `new-password`，验证码 `one-time-code`。OTP、PIN、卡号用 `type="text" inputmode="numeric"`（保留文本语义、无步进器），金额用 `inputmode="decimal"`；邮箱、验证码、用户名关掉 `spellcheck`。
- 不拦截粘贴；兼容密码管理器与验证码自动填充：真实 `<form>`、正确 `autocomplete`、不放假输入框。

推荐与避免：

```text
邮箱
[ name@example.com ]   可选示例，不需要时留空

用户名
[ 👤 用户名 ]          避免：Label 与 Placeholder 重复
[ 🔒 密码 ]            避免：输入后只剩含义不唯一的图标
```

## 验证与认证错误

- 初始空白不显示错误。默认提交时验证；已有即时验证模式时等用户完成输入再检查。错误出现后可随修正更新。密码强度和用户名可用性是明确的实时状态例外。
- 字段错误说明问题和修复动作；修好后移除 `aria-invalid`。不只用红色边框表达错误。
- 错误文案是指令：平静语气，不用"Oops"和感叹号，正面表述（"仅使用字母"而不是"不要用数字"）；能提前告知的格式要求写在 caption 里。同一错误大量重复发生时重做交互，不只改文案。
- 提交后把焦点移到第一个错误字段；提交按钮在表单合法前保持可点，用户要提交才知道卡在哪。
- 输入过程中不拦截字符、不实时过滤，先接受再校验；校验前先 trim，自动填充和输入法会带入首尾空格。
- 登录失败属于凭据组合错误，表单内统一提示"用户名或密码不正确"；不在密码字段下确认"密码错误"，不泄露账号是否存在；失败后清空密码值。
- 动态消息由状态驱动，更新稳定的 message slot：空的 live region 先存在于 DOM，再更新内容；不在任意按钮后命令式追加临时节点。
- 短表单用字段或表单内错误即可；长表单、多错误或提交后整页重载时加可聚焦的错误摘要，链接到对应字段。

## 提交与 Toast 时机

- 提交按钮在请求开始时才禁用，显示 spinner 并保留原文案（"保存"加 spinner，而非只剩 spinner）；文案告诉读屏用户哪个按钮在忙。
- 离开前提示未保存的修改；重渲染和 hydration 不丢失已输入的值与焦点。
- 自动消失的 Toast 只用于低风险确认：至少 5 秒，hover 或 focus 时暂停计时，标签页隐藏时也暂停。含动作、错误或用户可能要据此操作的信息时保持到手动关闭；撤销等唯一入口不放进会自动消失的 Toast。
- 不把焦点移到 Toast；用 `role="status"` 播报，焦点留在用户工作处。
