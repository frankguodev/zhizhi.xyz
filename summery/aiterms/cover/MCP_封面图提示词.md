# MCP 封面图提示词

## 生成目标

为 AI 词条《MCP》生成一张适合知之网站使用的社交分享图/封面图候选。图片用于后台人工审核和上传前参考，本地图片不直接写入发布稿的 `open_graph.image` 或 `twitter.image`。

建议尺寸：1200x630，JPG，目标小于 200KB。

## 推荐画面

画面中心是一个克制的“统一接口”抽象结构：一个简洁的 AI 应用窗口或节点，通过几条细线连接到文件、数据库、工具、提示词工作流等小型抽象图标。整体像长期知识库里的技术解释图，不要像营销海报。

## 主文案

MCP 是什么

## 副文案

连接 AI 应用与外部工具、数据源和工作流的开放协议

## 风格要求

- 符合知之网站：克制、清晰、长期知识库、技术内容。
- 画面干净，有留白，有轻微纸张或界面质感。
- 配色以温和浅底、深灰文字、低饱和绿色/蓝色点缀为主，避免单一大面积蓝紫。
- 字体气质接近现代无衬线中文标题，字形端正清楚。
- 视觉重点放在“协议连接”和“上下文流动”，不要堆砌品牌标识。

## 禁止事项

- 不使用未经证实的判断或夸张口号。
- 不出现 Anthropic、OpenAI、Claude、ChatGPT、Cursor、VS Code 等真实品牌 Logo。
- 不使用复杂 3D、霓虹赛博、人物肖像、夸张科技城市背景。
- 不生成难以辨认的文字、乱码、伪造 UI、伪造官方徽章。
- 不把本地图片路径写入发布稿 `open_graph.image` 或 `twitter.image`。

## 图片生成提示词

Use case: productivity-visual
Asset type: website article cover, 1200x630 landscape
Primary request: Create a restrained editorial cover image for a Chinese AI glossary entry about MCP, Model Context Protocol.
Scene/backdrop: clean light knowledge-base style background with subtle paper or interface texture.
Subject: a central abstract AI application node connected by thin lines to small generic icons representing files, database, tools, and prompt workflow; the idea is standardized protocol connection.
Style/medium: polished editorial technology illustration, flat plus subtle depth, no 3D spectacle.
Composition/framing: wide 1200x630 layout, clear title area on the left or upper-left, abstract connection diagram occupying the center/right, generous negative space.
Lighting/mood: calm, clear, trustworthy, long-term technical knowledge.
Color palette: warm off-white background, dark gray text, muted green and soft blue accents, avoid dominant purple-blue gradients.
Text (verbatim): "MCP 是什么" and "连接 AI 应用与外部工具、数据源和工作流的开放协议"
Constraints: Chinese text must be crisp, legible, and exactly as provided; no real company logos; no fake UI; no watermark; no marketing poster style.
Avoid: neon cyberpunk, complex 3D, people, brand logos, tiny unreadable labels, garbled text, exaggerated futuristic effects.

## image_alt 候选

抽象的 AI 应用通过统一接口连接工具、数据源和工作流。

## 接入提醒

没有真实线上图片路径前，`pro` 中 `open_graph.image` 和 `twitter.image` 保持空字符串。本地封面图需要上传后台或 R2 后，再把线上真实路径填入 `open_graph.image` 和 `twitter.image`，并保持两者一致。
