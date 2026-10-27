import { CHARACTERS, BACKGROUNDS, ACTIONS, PROPS, PLACES, EFFECTS, normalizeScenes, fallbackScenes, extractJson } from "../../../lib/storyScenes";

export const runtime = 'edge';

const names = (obj) => Object.values(obj).join("、");
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

    // 3分钟动画：豆包 0.85 倍速约每秒 4 字，550 字旁白约 2.5 分钟，加上镜头间停顿约 3 分钟
    const isAnimation = length === "动画";
    if (isAnimation) wordCount = 550;
    const paragraphCount = isAnimation ? 8 : 4;
    const structure = isAnimation
      ? `第1~2段：建立画面（角色 + 场景 + 温馨氛围）
第3~4段：出现小困扰（轻微冲突，不制造恐惧）
第5~6段：尝试解决（可以先失败一次，再想办法；鼓励主动、勇敢或思考）
第7~8段：温暖收尾（积极结果 + 情感升华）`
      : `第1段：建立画面（角色 + 场景 + 温馨氛围）
第2段：出现小困扰（轻微冲突，不制造恐惧）
第3段：尝试解决（鼓励主动、勇敢或思考）
第4段：温暖收尾（积极结果 + 情感升华）`;

  const prompt = `
你是一位专业儿童绘本作家，拥有多年出版经验，作品适合3岁孩子阅读和家长讲述。

请根据用户输入创作一个温暖、有画面感的故事。

【核心要求】
- 总字数：大约 ${wordCount} 字
- 分为${paragraphCount}段，每段${isAnimation ? "2~3" : "1~2"}句
- 每段适合作为一页绘本
- 语言简单、重复感适度（增强记忆）
- 句子节奏柔和，适合朗读
- 必须有情绪变化（平静 → 紧张 → 尝试 → 温暖）

【结构要求】
${structure}

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

【动画限制（最重要，必须遵守）】
这个故事会被自动做成动画，动画只能画出下面这些东西。故事里写到的每个动作、物品、地点都必须能在下面找到，否则画面会和文字对不上：
- 角色：最多两个，主角 + 最多一个朋友，种类只能是：${names(CHARACTERS)}（可以起名字）。
  如果主角“${character}”不是这几种，就改成外形最接近的一种，故事里也直接这样写。
- 地点只能是：${names(BACKGROUNDS)}
- 角色能做的事只能是：${names(ACTIONS)}。
  不要写列表以外的动作，例如游泳、飞、骑车、开车、钻洞、画画、唱歌、洗澡。
- 物品只能是：${names(PROPS)}。不要写列表以外的物品。
- 物品能发生的变化只能是：${names(PLACES)}
- 天气只能是：${names(EFFECTS)}
- 宝宝的想法里如果有列表以外的东西，用列表里最接近的来表达（例如“小火车”写成“小汽车”，“飞上天”写成“坐着气球看天空”）。
- 角色身上的蝴蝶结如果在故事里被吹走、弄丢，props 里要用 bow 表示它的变化。

【输出格式】
只输出一个 JSON 对象，不要任何其他文字，不要代码块标记：
{
  "paragraphs": ["第1段", "第2段", "……共${paragraphCount}段"],
  "hero": "主角形象",
  "friend": "配角形象，或 null",
  "scenes": [
    {
      "bg": "背景",
      "effect": "天气效果",
      "friend_present": false,
      "beats": [
        { "text": "本段第1句原文", "hero_action": "动作", "friend_action": "动作", "props": [{ "name": "道具", "place": "位置" }] },
        { "text": "本段第2句原文", "hero_action": "动作", "friend_action": "动作", "props": [] }
      ]
    }
  ]
}

字段说明（这些字段用来生成动画，只能从下面的英文值里选，不要自己造词）：
- hero / friend 只能是：${list(CHARACTERS)}。主角“${character}”如果不在其中，选外形最接近的一个。
- bg 只能是：${list(BACKGROUNDS)}。按每段实际发生的地点选，可以每段不同（例如“趴在窗台上”选 home）。
- effect 只能是：${list(EFFECTS)}
- scenes 与 paragraphs 一一对应，共${paragraphCount}个。
- beats：把这一段按句子拆成 1~3 个镜头，text 必须是该段原文里的连续文字，所有 beats 的 text 连起来就是整段。
- hero_action / friend_action 只能是：${list(ACTIONS)}。要贴合这一句里角色在做的事。
- props：这一句里出现的具体物品，最多2个。name 只能是：${list(PROPS)}；place 只能是：${list(PLACES)}。
  同一个物品在不同镜头里用不同 place 表达它的变化，例如蝴蝶结：hold（戴着）→ fly（被风吹走）→ high（挂在树上）→ fall（拿下来）→ hold。
  故事里没有对应物品就不填，不要硬加。
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
        max_tokens: isAnimation ? 4500 : 3000, // 分镜里会重复一遍原文，长故事需要更多 token
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
