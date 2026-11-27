# 频仔

慢信号台的吉祥物。圆润约两头身，靛蓝毛毡电台活物：胸口有琥珀蜂巢窗与黄铜调频旋钮，头顶一束黄铜天线，木脚，圆点眼睛与缝线微笑。

## 选定

候选 A。体量接近两头身的旧电台活物，胸口旋钮清楚，适合做转一下旋钮调频再回正、灯火亮一圈信号再落稳、侧耳或轻轻点头倾听再回静姿。选定名字时斟酌后定为「频仔」。

未选用：候选 B 为靛蓝提灯小灵，肚上琥珀灯火，黄铜提梁，更偏提灯，备选名「讯仔」，旋钮调频可读性较弱；候选 C 为靛蓝木屋信号台活物，屋顶黄铜风向标，备选名「台仔」，电台旋钮较弱。候选原图在 `art/_src/b30/b30-mascot-cand-{a,b,c}.jpg`。名字只写在文档里，没有画进画面。

不要画成写实人物，也不要做成紧急救援公职人员。不要把概念海报里的写实值班员后脑勺或写实人脸来电卡搬进封面或可玩角色。

## 文件

- `b30-mascot-hero.png` 英雄图，`1360×1360` 透明底。
- `b30-mascot-chroma-720x960.png` 品红底板 `#FF00AA`。勿改用绿幕：黄铜与琥珀灯光偏暖，品红抠像时须保护红大于蓝的铜面与旧木，以及琥珀灯光和靛蓝毛毡，以免铜面或灯火被抠灰。

## 三段真动画

源视频与图集在 `../anim/`。播放建议 `12 fps`，循环已向首帧做融合。源视频默认分辨率 `480p`（`480×640`），`24 fps`。整角色运动，不拆骨骼、不拆部件、不用整图晃动，也不是 GIF。

1. 转一下胸口的黄铜旋钮调频，身体微微前倾，再回正。
2. 琥珀窗轻轻亮起，一圈信号光扩开再落稳，回到起始姿势。
3. 侧耳倾听，天线微微低下，轻轻点头，再回静姿。

图集为 `6×4` 的 webp 与 png，json 内有单帧尺寸与身体锚点。身体锚点取第 0 帧最大连通域的质心。不要为了玩法去拆这些图集。

| 片段 | 单帧 | 锚点 |
| --- | --- | --- |
| tune | `374×456` | 约 `(204, 260)` |
| signal | `479×506` | 约 `(238, 262)` |
| listen | `352×454` | 约 `(164, 258)` |

## 中英 I2V 提示词

锁屏、固定机位、品红背景保持 `#FF00AA`，角色不走出画面，动作结束后回到首帧姿势。时长约五秒。不用绿幕。

**Tune / 调频**

English: Locked camera, solid magenta #FF00AA background stays completely still and uniform. The same soft felt radio character from the first frame: plump indigo felt body, amber honeycomb speaker window on the chest, a round brass tuning knob below the window, a short brass antenna tuft on top, wooden feet, bead eyes and a stitched smile. It stays centered and does not drift or bob as a whole image. The brass chest knob slowly rotates a short way clockwise as if tuning a frequency, the body leans slightly toward the knob, then the knob eases back and the character returns to the exact starting rest pose. Whole-character motion, no cuts, no text, no numbers, no green screen.

中文：锁定机位，纯品红背景保持均匀静止。同一只靛蓝毛毡电台小生物留在画面中央，整图不漂移、不整体晃动。胸口的黄铜旋钮慢慢顺时针转过一小段，像在调频，身体微微前倾，旋钮再转回，角色回到起始姿势。角色完整运动，无剪辑、无文字、不用绿幕。

**Signal / 信号**

English: Locked camera, solid magenta #FF00AA background stays completely still and uniform. The same soft felt radio character from the first frame: plump indigo felt body, amber honeycomb speaker window on the chest, a round brass tuning knob below the window, a short brass antenna tuft on top, wooden feet, bead eyes and a stitched smile. It stays centered and does not drift or bob as a whole image. The amber speaker window gently brightens and a soft ring of warm amber light expands once around the chest like a received signal, the antenna tuft twitches slightly, then the glow settles and the character returns to the exact starting rest pose. Whole-character motion, no cuts, no text, no numbers, no green screen.

中文：锁定机位，纯品红背景保持均匀静止。同一只靛蓝毛毡电台小生物留在画面中央，整图不漂移、不整体晃动。胸口琥珀窗轻轻亮起，一圈暖琥珀光像收到信号那样扩开，天线微微一颤，光再落稳，回到起始姿势。角色完整运动，无剪辑、无文字、不用绿幕。

**Listen / 倾听**

English: Locked camera, solid magenta #FF00AA background stays completely still and uniform. The same soft felt radio character from the first frame: plump indigo felt body, amber honeycomb speaker window on the chest, a round brass tuning knob below the window, a short brass antenna tuft on top, wooden feet, bead eyes and a stitched smile. It stays centered and does not drift or bob as a whole image. It tilts slightly to one side as if listening, the antenna tuft dips, then it gives a small gentle nod and returns to the exact starting rest pose. Whole-character motion, no cuts, no text, no numbers, no green screen.

中文：锁定机位，纯品红背景保持均匀静止。同一只靛蓝毛毡电台小生物留在画面中央，整图不漂移、不整体晃动。它侧过一点，像在倾听，天线微微低下，再轻轻点头，回到起始姿势。角色完整运动，无剪辑、无文字、不用绿幕。
