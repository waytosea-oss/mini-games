# 屿仔

方寸生态的吉祥物。圆润约两头身，森林绿毛毡岛灵，肚上贴着湖蓝毛毡水洼，脚上是沙黄毛毡靴，头顶一束沙黄芦穗，圆点眼睛。

## 选定

候选 A。体量接近两头身的毛毡岛灵，三种调色都在身上，适合做轻放或轻拍地块再收回、环顾整座小岛再回正、身上一圈水纹再落稳。选定名字时斟酌后定为「屿仔」。

未选用：候选 B 为湖蓝陶土小兽，头上水滴冠，披森林绿毛毡，更偏泽地，备选名「泽仔」；候选 C 为沙黄毛毡种籽身、绿叶帽与湖蓝围巾，岛屿身份较弱。候选原图在 `art/_src/b29/b29-mascot-cand-{a,b,c}.jpg`。名字只写在文档里，没有画进画面。

可玩的三种物种是独立的毛毡微缩，不要用屿仔去顶替它们，也不要把概念海报里的写实动物画进封面或可玩模型。

## 文件

- `b29-mascot-hero.png` 英雄图，`1360×1360` 透明底。
- `b29-mascot-chroma-720x960.png` 品红底板 `#FF00AA`。勿改用绿幕：森林绿靠近绿幕色相，品红抠像时须保护绿大于红的毛毡与苔面，以及湖蓝水洼与沙黄靴，以免绿地被抠穿。

## 三段真动画

源视频与图集在 `../anim/`。播放建议 `12 fps`，循环已向首帧做融合。源视频默认分辨率 `480p`（`480×640`），`24 fps`。整角色运动，不拆骨骼、不拆部件、不用整图晃动，也不用 GIF。

1. 轻轻放下或拍一枚沙黄平顶六角，再收回，回到起始姿势。
2. 环顾整座小岛（含侧面与背面），再回正。
3. 身上水洼荡起一圈细纹，并轻轻伸展，再落稳到起始姿势。

图集为 `6×4` 的 webp 与 png，json 内有单帧尺寸与身体锚点。身体锚点取第 0 帧最大连通域的质心。不要为了玩法去拆这些图集。

| 片段 | 单帧 | 锚点 |
| --- | --- | --- |
| place | `370×454` | 约 `(185, 266)` |
| look | `312×446` | 约 `(156, 257)` |
| ripple | `338×432` | 约 `(167, 252)` |

## 中英 I2V 提示词

锁屏、固定机位、品红背景保持 `#FF00AA`，角色不走出画面，动作结束后回到首帧姿势。时长约五秒。不用绿幕。

**Place / 轻放**

English: Locked camera, solid magenta #FF00AA background stays completely still and uniform. The same soft felt island spirit from the first frame: plump forest-green felt body, a lake-blue felt puddle on the belly, sand-yellow felt boots, a small tan reed tuft on the head, bead eyes. It stays centered and does not drift or bob as a whole image. It leans slightly, lifts one boot, gently sets a small sand-yellow flat-top hex tile down in front of itself, then returns to the exact starting rest pose. Whole-character motion, no cuts, no text, no green screen.

中文：锁定机位，纯品红背景保持均匀静止。同一只森林绿毛毡岛灵留在画面中央，整图不漂移、不整体晃动。身体微微前倾，抬起一只沙黄靴，把一枚小小的沙黄平顶六角轻轻放下，再回到起始姿势。角色完整运动，无剪辑、无文字、不用绿幕。

**Look / 环顾**

English: Locked camera, solid magenta #FF00AA background stays completely still and uniform. The same soft felt island spirit from the first frame: plump forest-green felt body, a lake-blue felt puddle on the belly, sand-yellow felt boots, a small tan reed tuft on the head, bead eyes. It stays centered and does not drift or bob as a whole image. It looks around the whole island, turning through a three-quarter view, a profile, and a brief back view, then turns back and returns to the exact starting rest pose. Whole-character motion, no cuts, no text, no green screen.

中文：锁定机位，纯品红背景保持均匀静止。同一只森林绿毛毡岛灵留在画面中央，整图不漂移、不整体晃动。它环顾整座小岛，转到四分之三侧面、侧面，再转到背面，然后转回来，回到起始姿势。角色完整运动，无剪辑、无文字、不用绿幕。

**Ripple / 水纹**

English: Locked camera, solid magenta #FF00AA background stays completely still and uniform. The same soft felt island spirit from the first frame: plump forest-green felt body, a lake-blue felt puddle on the belly, sand-yellow felt boots, a small tan reed tuft on the head, bead eyes. It stays centered and does not drift or bob as a whole image. A small ripple ring travels across the lake-blue felt puddle on its belly as the body makes a slight stretch, then everything settles back to the exact starting rest pose. Whole-character motion, no cuts, no text, no green screen.

中文：锁定机位，纯品红背景保持均匀静止。同一只森林绿毛毡岛灵留在画面中央，整图不漂移、不整体晃动。肚上的湖蓝毛毡水洼荡起一圈细纹，身体轻轻伸展，再落稳到起始姿势。角色完整运动，无剪辑、无文字、不用绿幕。
