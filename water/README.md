# Rivulet

A water-flow puzzle. Real particle fluid runs in the browser. Guide it into the glass.

66 levels. English in the game. The hub card is listed in Chinese as 细流引水.

## How to play

Water falls from the brass spout. Put it in the glass.

- **First Streams** — drag a line. Fresh ink becomes a gutter. Finish the stroke and the pour begins.
- **Sliding Gates** — drag the gate until the shaft is clear.
- **Elbow Pipes** — tap the pipe to turn it. Water passes when the bore is vertical.
- **Pull the Pin** — tap the peg.
- **Floodgates** — tap the wheel.
- **Sponges** — a dry sponge drinks the pour. Tap it to squeeze, and water falls through.
- **Kettle** — open the high gate. Heat lifts the water; the cold coil turns it back into a stream.
- **Painted Water** — blue and yellow must mix. The glass only keeps green.
- **Clockwork** — open the valve above the moving bar.

Stars: fill the glass, use little ink, and finish under the par time. One star is a clear. Progress is stored in `localStorage` (`rivulet-v1`).

Undo, retry, and a pause menu are on the board. **Hint** and **Skip this level** ask for a rewarded ad when a portal SDK is active. On the hub build, with no SDK, those buttons still work so the puzzle can be practiced. They are never required.

Graphics: **Auto** watches the frame time and drops to fewer particles and a smaller water buffer when the device is slow. **Low** and **High** are manual. Low is the target for cheap Android phones and school Chromebooks.

## Portal zip

From this folder:

```bash
node build-portal.mjs
node build-portal.mjs --sdk poki
node build-portal.mjs --sdk crazygames
```

The zip is written to `dist/`. It does not include the hub button, `track.js`, or any request to the hub. The default zip loads no SDK (ads are no-ops, and rewarded buttons do not grant a reward). `--sdk` bakes one SDK:

| Flag | Script the adapter loads |
| --- | --- |
| `poki` | `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` |
| `crazygames` | `https://sdk.crazygames.com/crazygames-sdk-v3.js` |

You can also leave the stub zip and tell the portal page to open the game with `?sdk=poki` or `?sdk=crazygames`. `?portal=1` hides the hub button without loading an SDK. `?ads=preview` shows a fake interstitial so you can see the break.

`ads.js` calls:

- `gameplayStart` / `gameplayStop` (also when the tab hides)
- `loadingStart` / `loadingStop`
- `commercialBreak` between levels, at most once every 180 seconds
- `rewardedBreak` for Hint and Skip

Upload the unzipped folder, or the zip, as a single HTML5 game. Serve it over HTTP. ES modules do not run from `file://`.

## Check the levels

```bash
node tools/verify.mjs
node tools/verify.mjs --high
```

Every level has a solution. The check fails if that solution misses the glass, or if the level can be won without touching it.

## Credits

The particle solver and the screen-space water shading follow the same approach as the public fluid lab (predict, grid hash, pressure relaxation, depth and thickness, bilateral blur). The picture here is clear water. Three.js in `vendor/` is MIT, copyright 2010–2023 Three.js Authors. Sound is synthesized in the browser. There are no audio files.

---

# 细流引水

浏览器里的真实粒子水流谜题。把水引进杯子。共 66 关。游戏内界面是英文，游戏屋卡片用中文名「细流引水」。

## 怎么玩

水从铜壶嘴落下，引进玻璃杯。

- **第一束**：按住拖出一条墨线，松手后水才开始倒。墨线会变成导水槽。
- **滑门**：把闸门拖开，竖井通了水才会落下。
- **弯管**：点管子旋转，竖直时水才能通过。
- **拔销**：点销钉。
- **闸阀**：点轮盘。
- **海绵**：干海绵会把水吸干。点一下拧干，水就能穿过去。
- **水壶**：打开高处的门。热水变成蒸汽，碰到冷管再落回杯子。
- **调色**：蓝色和黄色要混成绿色，杯子只收绿色。
- **发条**：打开移动横杆上方的阀门。

星星看杯子满不满、墨水用多少、时间是否进线。过关至少一星。进度在本地 `rivulet-v1`。撤销、重来、暂停都在画面上。提示和跳关在接入平台 SDK 时会请求激励视频；没接 SDK 的游戏屋版本里这两个按钮可以直接用，但不用它们也能过关。

画质 **Auto** 会在帧时间变长时减少粒子和水面分辨率。也可以手动选 **Low** / **High**。Low 面向低端安卓和学校 Chromebook。

## 平台压缩包

在本目录执行：

```bash
node build-portal.mjs
node build-portal.mjs --sdk poki
node build-portal.mjs --sdk crazygames
```

zip 在 `dist/`。包里没有返回游戏屋的按钮，没有 `track.js`，也不会请求游戏屋的统计地址。默认包不加载任何广告 SDK（激励按钮不会发奖励）。`--sdk` 会写死上面两个官方脚本之一。也可以不写死，上架后用网址参数 `?sdk=poki` 或 `?sdk=crazygames`。`?portal=1` 只隐藏返回按钮。`?ads=preview` 会弹出一个假广告，用来看关卡之间的间隔。

`ads.js` 提供 `gameplayStart` / `gameplayStop`、`loadingStart` / `loadingStop`、关卡之间的 `commercialBreak`（最少间隔 180 秒）、提示和跳关用的 `rewardedBreak`。切到后台时也会停止 gameplay。

用 HTTP 打开。直接双击本地文件时，ES module 不会运行。

## 校验关卡

```bash
node tools/verify.mjs
node tools/verify.mjs --high
```

每一关都带解答。解答没灌进杯子，或者不操作也能过，校验都会失败。

## 署名

粒子和水的画法与公开的流体实验相同（预测、网格哈希、压力松弛、深度与厚度、双边模糊）。这里只画清水。`vendor/` 里的 Three.js 为 MIT，版权 2010–2023 Three.js Authors。声音全部由浏览器实时合成，没有音频文件。
