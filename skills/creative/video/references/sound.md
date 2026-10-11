# 声音

评片时声音先于画面：声音业余，画面再好也显业余。下面的数字是试听起点，不是平台标准；最后以 `media.py` 的实测和用户试听为准。agent 听不到声音，所以选曲、对位都靠测量，交付时列出请用户试听的时间段。

## 旁白

- Fish 的 key 放在 `~/.config/fish-audio/config.json`（`{"key": "..."}`）。
- 先量语速再写全文：选好音色后按片型的 `speed` 合成一句（`python3 scripts/fish_tts.py "一句话" --voice <id> --speed 1.15 --out /tmp/rate.mp3`），输出里有 `chars_per_second`，字数按导演流程第 1 步的公式算。不同音色从每秒 3.5 字到 7 字都有，同一个 `speed` 在不同音色上的提速也不一样，不能套固定数。
- 挑音色：`python3 scripts/fish_tts.py --find 纪录片` 按热度列出中文音色，带描述和试听地址；同名音色按使用次数和描述挑，选中的 id 写进 `timeline.json` 的 `voice`。
- 旁白逐句写进 `lines`：`text` 是屏上显示的写法；读法不同时写 `say`（编号、型号、英文缩写按读法写：1202 写成幺二零二，bcu 写成 B C U）；`gap` 是这句前的停顿秒数，省略时取时间表顶层的 `gap`。
- `python3 scripts/fish_tts.py --timeline timeline.json` 合成全部旁白到 `public/vo/`（每句统一到 -16 LUFS），按实际时长写回每句的 start、end；节拍写了 `from` 的，起止也一并写回；总时长 = 最后一句结束 + `tail`。改了旁白就重跑：没改的句子沿用原音频，时长不变；锚点写的时刻会跟着走。
- 画面要卡在某个词上时，在那个词前断成两句，句边界就是精确时间；后一句 `gap` 写 0.05，听起来仍是一句话。
- 句间停顿按片型（时间表的 `gap`）；每一拍都比它的第一句早 0.3 秒开始（画面先动，旁白随后）。兑现句前的停顿由脚本按 `hold` 自动算，不手写。兑现的冲击音放在点名它的那句旁白之前的停顿里：压在人声底下会被让位压掉。

## 配乐

- 来源按顺序：用户给的曲子 → 允许商用的授权曲库。Mixkit 的 Stock Music Free License 允许网络、社交平台和广告使用，免署名；不允许电视广播、游戏，不允许改成纯音乐作品。按风格逛 `https://mixkit.co/free-stock-music/tag/<标签>/`（如 corporate、cinematic、electronic），音频地址在页面的 `data-audio-player-preview-url-value` 里（`https://assets.mixkit.co/music/<id>/<id>.mp3`）；许可看页面 JSON-LD 里 `MusicRecording` 条目的 `copyrightNotice`，标签页没有就打开单曲页看，确认是 Stock Music Free License 而不是 Restricted License。标签页每张卡有曲名和风格词，先按它们挑候选再量能量；有的标签页只有一两首，换相近的标签。页面要用 `curl -L` 加浏览器的 User-Agent 才取得到；曲名、时长、风格在页面的 JSON-LD 里，标签页上曲名和音频地址对不上号时，打开单曲页核对。曲名、ID 和许可写进 `public/music/SOURCE.md`。有版权的曲子只在用户提供并确认时用。曲库里找不到合题的（如中国风），用中性的氛围、钢琴或弦乐垫底，交付时说明，并请用户提供更合适的曲子。
- 选段靠测量：用 `ffmpeg -i music.mp3 -af "asetnsamples=n=44100,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null -` 这类命令取每秒的能量曲线，找"稀疏段接满编进入"的那一下，对准画面最重要的一刻；不默认从曲子开头用。整首能量都差不多平的曲子，或满编来得比兑现早太多的，兑现处用 `gain` 关键帧自己做出"压静、再满"，满编进入对准更早的一个转折。配乐的 `start` 写成锚点，让曲子跟着旁白走：截好的 bed 在第 X 秒满编进入，就写 `"start": "payoff-X"`；bed 开头要早于片头时，用 `from` 跳过多出来的部分。结尾选能量自然回落处淡出，片尾不留静音。
- 节拍检测不可靠，默认不硬卡拍，按能量包络对齐；曲子标了 BPM 或用户要求卡点时，才按拍子网格剪，剪点放在 2/4/8 拍的乐句上。
- 配乐截好要用的段落、统一到和旁白一样的电平再放进项目：`python3 scripts/media.py level in.mp3 --start <起点秒> --length <秒> --out public/music/bed.mp3`（时间表里 `from` 就写 0）。这样 `gain` 直接是"比人声低多少"：旁白期间模板再压 6 dB，平时写 -8，旁白时就低 14 dB。再低手机外放就听不见了；没有旁白的段落可以抬到 -3 左右。

## 音效

- 只给真实的方向变化配：整片级的上扬音和冲击音各只用一次；元素落定、点击这类小音效另算，同样只给真正的变化；持续运动（漂移、颗粒、旋转）不出声；任意 100ms 内最多 2 个。
- 写实风格用录音素材：Mixkit 音效都是 Sound Effects Free License，按类别逛 `https://mixkit.co/free-sound-effects/<类别>/`（如 whoosh、click、impact），音频地址在页面的 `data-audio-player-preview-url-value` 里。先高通 150–220Hz、低通 9–11kHz，首尾各 5ms 淡入淡出。纸、积木这类风格化世界才用代码合成。
- whoosh、点击这类轻音效多出几个候选，按能量分布筛：150Hz 以下占一半以上的发闷，6kHz 以上超过 40% 的刺耳，都丢掉。占比用 `python3 scripts/media.py sfx <文件...>` 量（`low_share`、`high_share`）。冲击音本来就以低频为主，不按这条筛，只高通 40Hz 去掉听不见的次低频。
- 对位前先用 `python3 scripts/media.py sfx <文件...>` 量出起音点 `onset` 和峰值 `peak`（秒）；点击按起音点对齐，whoosh 和冲击按峰值对齐：`at` = 画面变化的时刻 − 这个秒数，写成锚点如 `"payoff-0.42"`。峰值比画面里的动作长太多时（1 秒的 whoosh 配 0.3 秒的跳），用 ffmpeg `-ss` 裁掉峰值前多出来的部分再量一次。
- 增益按实测电平设：先用 `media.py sfx` 看每个文件的 `peak_db`，峰值差多少，`gain` 就补多少，再按轻重排（冲击最响，点击比旁白低 6–10 dB）。
- 兑现的先后：画面静止 `hold` 秒、配乐 `gain` 压到 -40 dB 左右 → 兑现动作在兑现拍开始，0.3 秒内落定，冲击音的峰值对准落定那一帧（锚点如 `"payoff+0.2"`），配乐同时回到满音量 → 兑现那句旁白在兑现拍开始 0.3 秒后开口（`fish_tts.py` 排节拍时已经留出）。画面最忙的段落不是最响的段落。

## 混音

- 旁白、音效、配乐都写进 `timeline.json`，模板的 `Soundtrack` 按它播放；配乐写成 `"music": { "src": "music/bed.mp3", "start": 0, "from": 0, "gain": [[0, -8], ["payoff-0.8", -8], ["payoff-0.3", -40], ["payoff+0.2", -3]] }`，`gain` 是关键帧列表，旁白期间自动再压 6 dB。配乐文件放好之后再加这一项。
- 无配乐版：`npm run render:nomusic`（只去掉配乐）。两版都用 `python3 scripts/media.py master` 统一响度，见导演流程第 7 步。
