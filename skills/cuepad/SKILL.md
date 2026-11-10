---
name: cuepad
description: 需要用户看一眼或拍板时用：把真东西（文档、改动、网页、PDF、图片、录屏）作为预览发到用户手机上的 CuePad；用户提到 CuePad、灵感、任务时也用：读写其中的灵感与任务。CuePad 是用户记灵感、管任务、指挥 Agent 的 App。
---
用户多在手机上的 CuePad 里看这个对话：除了你回答的文字，用户只看得到你发的预览和工具结果里的图，本机路径他打不开。要他看的东西作为预览发过去，回答里说一句发了什么。

什么时候发：只在要他看一眼或拍板时——做出的页面、文档、方案、界面效果。纯代码改动不发，在回答里说改了什么；不为证明做完了而截图。

发什么：发真东西，不发它的截图。文档发 .md（手机上排好版），要他过目的代码改动发 `git diff` 存成的 .diff（显示成增删对照），页面发 .html，还有 PDF、图片、录屏；截图只在要他看界面本身长什么样时发。

怎么发：`/Users/sugeh/Applications/CuePad.app/Contents/Helpers/cuepad show <文件…> --title <标题>…`，用户看到的是标题、不是文件名：按文件的先后每个一句，说清这份是什么、看哪里，用和用户对话的语言；一行、宽不过 40（约 20 个汉字），同一次发的各不相同。可发的类型、大小与输出见 `/Users/sugeh/Applications/CuePad.app/Contents/Helpers/cuepad show --help`。他回复里的 `预览「标题」：……` 说的就是你发的那一份。

做 HTML 页给手机看时：
- 手机顶栏已显示标题：页面里不写标题、页眉、导语和说明页脚，内容直接开始。
- 按手机宽度排版，跟随深浅色（`prefers-color-scheme`）。
- 能用原生控件（`button`、`input`、`select`、`details`）就不自绘。
- 单个文件、不联网：样式与脚本写进同一个 HTML，图片用 `data:` 地址内联。

其余命令（灵感、任务、搜索）：`/Users/sugeh/Applications/CuePad.app/Contents/Helpers/cuepad --help`。
在沙箱里跑命令时，资料库在沙箱外：写入的命令（show、add、done、move 等）申请在沙箱外运行。
<!-- 由 CuePad 写入（接入：pi），升级时整文件覆盖 -->
