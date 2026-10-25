# 游戏屋新游戏模板

1. 复制 `_template/` 为新目录（如 `mygame/`），把 `game.js` 里的 `GAME_ID` 改成目录名。
2. 在 `track.js` 的 `GAMES` 和服务器 `api/collect.php`、`admin/api.php` 中加入新 ID，否则统计会被丢弃。
3. 共用件在 `common/`：`kit.css`（面板、按钮、星级、选关网格、返回游戏屋胶囊、AI 说明脚注，CSS 变量换肤）和 `kit.js`：
   - `KIT.load/save` 存档；`KIT.init({game, save, hubButtons})` 自动记录「最近玩过」并在离开页面时存档
   - `KIT.goHub` 返回游戏屋；`KIT.show(id)` 切换 `.scr` 屏；`KIT.toast`、`KIT.vib`、`KIT.stars`
   - `KIT.levelGrid(host, {...})` 选关网格；`KIT.audio()` Web Audio 合成总线（只用合成音，不放音频文件）
   - `KIT.gt()` 返回 track.js 的统计接口（title/lv/win/fail/quit/pause/hub/sound）
4. 上架游戏屋：`hub/dyn/<id>.mp4|webp`（716×936 动态海报）、`hub/icons/<id>.webp`（360）与 `<id>-s.webp`（180）、`hub/shots/<id>-1..4.webp`（390×844），在首页加故事卡、游戏卡、列表项，并写上 `data-cat`（益智、动作、休闲、文化、经营）；`hub/poster.js` 的 `CFG` 加一组粒子。
5. 字体只用 OFL 授权字体；页脚保留「部分美术与动画由 AI 生成」。
