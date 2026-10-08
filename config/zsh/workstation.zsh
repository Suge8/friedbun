# 由 ~/.zshrc 末尾 source。密钥放 ~/.config/friedbun/env.zsh，不入库。
export PI_CACHE_RETENTION=long
typeset -U path
path=(~/.local/bin $path)
[[ -r "$HOME/.config/friedbun/env.zsh" ]] && source "$HOME/.config/friedbun/env.zsh"

[[ -o interactive ]] || return 0

HOMEBREW_PREFIX="${HOMEBREW_PREFIX:-$(brew --prefix)}"
ZSH_AUTOSUGGEST_STRATEGY=(history completion)
ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE=20
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=8'
source "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
eval "$(starship init zsh)"
# syntax-highlighting 必须在所有 zle widget（含 starship 定义的）之后加载
source "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
# 只在登录 shell 打印（Herdr 面板在 macOS 上也是登录 shell），子 shell 不重复刷屏
[[ -o login ]] && command -v fastfetch >/dev/null && fastfetch
