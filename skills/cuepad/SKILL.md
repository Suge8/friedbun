---
name: cuepad
description: 交付能看的成果（截图、录屏、网页、PDF、文稿）给用户验收，或用户提到 CuePad、灵感、任务时用：把文件发到用户手机上的 CuePad，读写其中的灵感与任务。CuePad 是用户记灵感、管任务、指挥 Agent 的 App。
---
用户多在手机上看你的成果：本机路径他打不开，工具结果里的图（截图、读进来的图片）他也看不到。做完时把能看的成果发到手机，回答里说一句发了什么；指挥你的 Cue 也在那里核对。

发到手机：`/Users/sugeh/Applications/CuePad.app/Contents/Helpers/cuepad show <文件…> --title <标题>…`。用户看到的是标题、不是文件名：按文件的先后每个一句，说清这是什么、看哪里，用和用户对话的语言、约 20 字以内（如 `--title "改后：会话列表的分组标题"`）。一次给几个文件是同一张卡，点开后左右切换。

做 HTML 页给手机看时：
- 手机顶栏已显示标题：页面里不写标题、页眉、导语和说明页脚，内容直接开始。
- 按手机宽度排版，跟随深浅色（`prefers-color-scheme`）。
- 能用原生控件（`button`、`input`、`select`、`details`）就不自绘。
- 单个文件、不联网：样式与脚本写进同一个 HTML，图片用 `data:` 地址内联。

其余命令（灵感、任务、搜索）：`/Users/sugeh/Applications/CuePad.app/Contents/Helpers/cuepad --help`。
在沙箱里跑命令时，资料库在沙箱外：写入的命令（show、add、done、move 等）申请在沙箱外运行。
<!-- 由 CuePad 写入（接入：pi），升级时整文件覆盖 -->
