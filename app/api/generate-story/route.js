import { CHARACTERS, BACKGROUNDS, ACTIONS, normalizeScenes, fallbackScenes, extractJson } from "../../../lib/storyScenes";

export const runtime = 'edge';

const list = (obj) => Object.entries(obj).map(([k, v]) => `${k}（${v}）`).join("、");
export async function POST(req) {
  try {
    const body = await req.json();
    const { character, scene, theme, child_input, length } = body;

 /* ===================== */
    /* 📏 长度控制 */
    /* ===================== */
    let wordCount = 200;

    if (length === "短") wordCount = 100;
    if (length === "中") wordCount = 200;
    if (length === "长") wordCount = 400;

  const prompt = `
你是一位专业儿童绘本作家，拥有多年出版经验，作品适合3岁孩子阅读和家长讲述。

请根据用户输入创作一个温暖、有画面感的故事。

【核心要求】
- 总字数：大约 ${wordCount} 字
- 分为4段，每段1~2句
- 每段适合作为一页绘本
- 语言简单、重复感适度（增强记忆）
- 句子节奏柔和，适合朗读
- 必须有情绪变化（平静 → 紧张 → 尝试 → 温暖）

【结构要求】
第1段：建立画面（角色 + 场景 + 温馨氛围）
第2段：出现小困扰（轻微冲突，不制造恐惧）
第3段：尝试解决（鼓励主动、勇敢或思考）
第4段：温暖收尾（积极结果 + 情感升华）

【教育目标（隐性）】
自然传递以下其中1-2个价值：
- 勇气
- 善良
- 分享
- 社交
- 自信

【语言风格】
- 多用具体画面（风、月光、树叶、小路等）
- 避免抽象说教（不要“要勇敢”这种直说）
- 用动作和情境表达情绪
- 可以适当重复关键词（例如“小兔子轻轻地走着”）
- 温柔、轻松、有趣

要求：
- 主角：${character}
- 故事发生在：${scene}
- 主题：${theme}
- 故事灵感来自宝宝的想法：${child_input}
- 不要标题
- 不要解释

输出风格接近波西和皮普的故事。

【输出格式】
只输出一个 JSON 对象，不要任何其他文字，不要代码块标记：
{
  "paragraphs": ["第1段", "第2段", "第3段", "第4段"],
  "hero": "主角形象",
  "friend": "配角形象，或 null",
  "scenes": [
    { "bg": "背景", "friend_present": true, "hero_action": "主角动作", "friend_action": "配角动作" }
  ]
}

字段说明（这些字段用来生成动画，只能从下面的英文值里选）：
- hero / friend 只能是：${list(CHARACTERS)}。主角“${character}”如果不在其中，选外形最接近的一个。
- bg 只能是：${list(BACKGROUNDS)}
- hero_action / friend_action 只能是：${list(ACTIONS)}
- scenes 与 paragraphs 一一对应，共4个；动作要符合该段的情绪
`;

    const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("LLM_ERROR:", response.status, detail);
      return Response.json(
        { error: "LLM_FAILED", status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const input = { character, scene };

    // 优先用模型给的结构化分镜；解析失败就把整段回复当纯文本故事拆分
    let animation = normalizeScenes(extractJson(content), input);
    if (!animation) animation = fallbackScenes(content, input);

    const story = animation
      ? animation.scenes.map((s) => s.text).join("\n")
      : content;

    if (!story) {
      return Response.json({ error: "EMPTY_STORY" }, { status: 502 });
    }

    return Response.json({ story, animation });

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
