# 素材记录

## 桌面快捷方式头像（2026-10-30）

使用内置 imagegen，以 `pet.png` 作为身份与画风参考，生成独立头像 `assets/app-icon.png`；由 `scripts/build-icon.js` 仅缩放、封装为 16／24／32／48／64／128／256 像素的 `assets/app-icon.ico`。没有修改桌宠角色素材。程序、托盘和桌面快捷方式共用此图标。

最终提示词：

Use case: stylized-concept. Asset type: Windows desktop app icon, square 1024x1024 transparent PNG. Reference image: the supplied PetClick chibi Miku is the identity and style reference. Create one extremely cute compact HEAD-ONLY avatar icon of this same character: cyan/teal hair, short visible twin-tail tips, original green leaf on her head, navy and pink hair accessories, huge teal eyes with white highlights, rosy cheeks, tiny round open mouth with a small drool strand. Preserve the simple thick dark navy hand-drawn outline and flat pastel palette. Face fills most of the square, centered with generous safe margin of 7 percent on all sides. Slight head tilt, same silly innocent expression as the reference. Simplify small details for readability at 32 and 48 pixels. No body, no keyboard, no text, no letters, no badge, no solid background, no shadow outside the silhouette. Real alpha transparency. This is ONLY an app shortcut icon and must not modify the desktop-pet sprite.

使用内置 imagegen 编辑，未使用 CLI 或额外 API 密钥。原图保留在 `original.png`，生成结果复制进本项目：`pet.png`（透明角色）、`pet-blink.png`（闭眼帧）。界面通过局部裁切复用手臂和闭眼区域，键盘是程序绘制的界面。

## pet.png 的最终提示词

Faithfully extract the attached chibi character onto a real transparent background. Edit target is the attached drawing. Remove exterior white and white negative space only, keeping the internal whites (skin, white eye highlights, top leaf). Preserve pose, face, clothing, cyan twintails, green leaf, thick navy lines and composition exactly. Full figure same framing/aspect ratio. No objects added, no text, no redesign. Output PNG with alpha transparency.

## pet-blink.png 的最终提示词

Use case: precise-object-edit. The edit target is the attached transparent character cutout, used as a blink animation frame. Change ONLY the two eyes into gently CLOSED eyes: replace the teal irises and white eye highlights with matching flat pale skin (#fff3f3), add one simple curved dark navy closed-eyelid line at each original eye center, respecting the tilted face. Preserve everything else EXACTLY: same character scale, exact same head/face/hair/hand positions, same tilt, same canvas framing and aspect ratio, mouth, eyebrows, cyan hair, green leaf, clothing and outline. Eyes closed peacefully, no eyelashes added beyond the original style. Keep real transparent background. No keyboard, no new objects, no text. This is the same frame with only eyelids blinking, not a redraw.

## 1.1 更新：pet-body.png

使用内置 imagegen 进行身体底图局部编辑，保留原图、原透明图与闭眼图，不覆盖旧文件。新底图 `pet-body.png` 用于清理原有下垂袖套与整理身体。手臂不是从新底图裁下来的：运行时以连贯的 SVG 上臂、袖套和简化手部曲线绘制，肩膀始终连接身体。

最终提示词：

Use case: precise-object-edit. Edit target: the supplied transparent chibi Hatsune Miku. Production base layer for a 2D desktop-pet arm rig. Preserve the complete head, face, eyes, mouth, cyan twintails, green leaf, hair ornaments, exact identity, linework, color palette, scale, framing and tilted pose. Change only the lower body: remove the two existing hanging dark detached sleeve/forearm shapes, and redraw a simple tidy light gray sleeveless torso with teal tie, seated behind a desk that will be drawn later. Leave two small natural bare upper-arm/shoulder attachment areas at each side of the torso; the articulated arms will be drawn separately by code. Do not draw hands, lower arms, detached limbs, keyboard, desk, text or any new objects. Keep the silhouette of both long twintails and outfit. Do not move or resize the character. Transparent alpha background. Exact same composition and aspect ratio as the input. This is a torso cleanup for a continuous shoulder-to-hand arm rig, not a character redesign.

## 1.2 更新：恢复原画手臂

当前版本撤掉 1.1 的重绘手臂与 pet-body.png。实际界面重新使用初版透明原画 pet.png；源文件 original.png 继续保留。

本次没有生成或重画手臂。完整上臂和袖套通过运行时 SVG 遮罩从同一张原画分层，图像只绕肩膀作有限角度的刚性旋转。补间帧只改变角度，不改变原画的长度、粗细和轮廓。pet-body.png 已清理，历史快照保存在备份中，当前界面不加载它。


## 1.3 更新：键盘遮挡与区域落点

继续复用原画，不新增任何重绘手臂素材。身体原图放在键盘后，原图手臂层放在键盘前，裁边被背沿遮住。根据键位位置选择有限的横向/纵向落点，再作短距离抬起与下压；只允许刚性平移和微角度旋转，不允许缩放、拉伸或弹性弯曲。

## 1.4 更新：完整手臂与遮挡底图

使用内置 imagegen（没有使用 CLI）生成 `assets/pet-backing-v14.png`。这张图只补齐手臂挪开后露出的身体，不是替换手臂的动作帧。完整手臂继续逐像素复用 `pet.png`：上臂、袖套、袖口一起绕肩部转动。删除 1.3 的横向裁断和整臂平移；静止和回位时恢复原图身体，补绘底图只在对应手臂动作时局部显示。

完整提示词：

Use case: precise-object-edit. Edit target: this transparent chibi Miku asset, 1274 by 1234 composition. Create a clean backing plate for animation. Remove BOTH COMPLETE hanging arms, including the pale exposed upper arms from under the face, the entire dark detached sleeves, and their teal cuffs. Reconstruct only the small previously occluded torso/lap areas naturally: gray sleeveless blouse, original teal tie, dark skirt and the transparent space between the body and long hair. Do NOT leave shoulder stubs, pale floating pieces, hands, sleeves or any detached limbs. Preserve the exact placement and shape of the head, face, eyes, hair, green leaf, collar, tie, skirt and every unaffected pixel. Keep the canvas dimensions/aspect ratio/framing unchanged with the character at exactly the same position. Original thick dark navy linework and palette. The arms will be overlaid from the source asset in code; this image is ONLY the hidden clean backing, not a new pose. No keyboard, no text, no new objects. True transparent background.

## 1.5 更新：轮廓与定位

没有生成或重画新的手臂。沿现有 SVG 分层边界补齐 11 像素深蓝轮廓线，完整原画手臂随肩部旋转。继续复用 1.4 的局部身体遮挡底图。键盘朝向与定位由程序计算。

## 1.5.2 更新：呼吸与口水滴落

原有 original.png、pet.png、pet-blink.png、pet-backing-v14.png 未作修改，已与 1.5.1 的打包素材逐字节比对。呼吸由 CSS 同步移动身体、完整手臂和遮挡层；水滴为新增 SVG 小图形，配色沿用原画，独立叠在键盘前、手臂后。没有生成新的角色图片，也没有改画原有口水。

## 1.5.3：口水本体变形与袖套裁边

内置 imagegen 生成 `assets/drool-backing-v153.png`，仅作为原口水轮廓下的局部清理底图，不替换角色其他部分。口水蓝色区域从原图分层，以嘴边为固定点拉长、变细，再断开滴落；原 PNG 保持不变。袖套只修 SVG 边界、边框和内侧小缺口，补齐纹理复用原图邻近袖套颜色，不生成新手臂。

底图完整提示词：

Use case: precise-object-edit. Edit target: the supplied transparent chibi Miku, exact 1274 x 1234 composition. Create a clean plate ONLY for removing the existing hanging blue-gray saliva/drool strand from the mouth. The strand is the slim pale cyan and blue-gray vertical oval at approximately x=600..654, y=760..900. Remove this one strand and reconstruct the tiny obscured portions of pink mouth edge, pale skin, dark navy chin contour, and gray collar underneath it. Keep the original small round open pink mouth. Do not close, reshape, move or redesign the mouth. Preserve the exact position, scale, framing and every other part: eyes, face expression, hair, green leaf, costume, arms, hands and background transparency. Do not add any new drool, droplet, tongue, teeth, text or objects. Same tilted pose, same clean navy outlines and palette. This is a local hidden clean backing for animation, not a character redesign; preserve all unaffected content and exact alignment. True transparent alpha background.

