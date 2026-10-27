// 动画素材库：大模型只能从这里挑选，播放器也只认识这些值。
export const CHARACTERS = {
  rabbit: "小兔子",
  cat: "小猫咪",
  duck: "小鸭子",
  bear: "小熊",
  dog: "小狗",
  pig: "小猪",
};

export const BACKGROUNDS = {
  forest: "森林/草地/公园",
  city: "城市/街道",
  beach: "海边/河边",
  night: "夜晚/星空/月亮",
  home: "家里/房间",
};

export const ACTIONS = {
  idle: "站着",
  walk: "走路",
  hop: "蹦跳",
  dance: "跳舞",
  wave: "挥手打招呼",
  sad: "难过/担心",
  think: "思考",
  hug: "拥抱",
  sleep: "睡觉",
  reach: "踮脚伸手够东西",
  look_up: "抬头看",
  eat: "吃东西",
  push: "推东西",
  climb: "爬树（爬画面里的大树）",
};

// 道具：故事里提到的具体物品，画在场景里
export const PROPS = {
  balloon: "气球", bow: "蝴蝶结/丝带", kite: "风筝", umbrella: "雨伞", flower: "花",
  gift: "礼物", cake: "蛋糕", cookie: "饼干/点心", apple: "苹果/水果", carrot: "胡萝卜",
  fish: "鱼", ball: "球", book: "书", lantern: "灯/灯笼", star: "星星",
  cart: "小推车", ladder: "梯子", boat: "小船", car: "小汽车", leaf: "树叶",
  shell: "贝壳", hat: "帽子", basket: "篮子", bubble: "泡泡",
};

// 道具的位置/状态
export const PLACES = {
  hold: "主角拿在手里（蝴蝶结、帽子表示戴在主角头上）",
  friend: "配角拿在手里",
  ground: "放在地上",
  between: "两人中间（一起分享）",
  fly: "被风吹走/正在飞走",
  high: "挂在高高的树上（够不着）",
  sky: "在天上",
  fall: "从高处落下来",
};

// 天气/光线效果
export const EFFECTS = {
  none: "无",
  wind: "刮风",
  rain: "下雨",
  snow: "下雪",
  sunset: "夕阳/傍晚",
  sparkle: "闪闪发光（开心、成功的时刻）",
};

const KEYWORDS = {
  characters: {
    rabbit: ["兔"],
    cat: ["猫", "咪"],
    duck: ["鸭", "鹅", "鸡", "鸟"],
    bear: ["熊"],
    dog: ["狗", "汪"],
    pig: ["猪"],
  },
  backgrounds: {
    night: ["夜", "星", "月", "晚", "睡"],
    beach: ["海", "河", "湖", "沙滩", "水"],
    city: ["城", "街", "马路", "商店", "车"],
    home: ["家", "房间", "床", "屋"],
    forest: ["森林", "树", "草", "花", "公园", "山"],
  },
};

function matchKeyword(text, table, fallback) {
  const s = String(text || "");
  for (const [key, words] of Object.entries(table)) {
    if (words.some((w) => s.includes(w))) return key;
  }
  return fallback;
}

export function guessCharacter(text) {
  return matchKeyword(text, KEYWORDS.characters, "rabbit");
}

export function guessBackground(text, fallback = "forest") {
  return matchKeyword(text, KEYWORDS.backgrounds, fallback);
}

const pick = (value, allowed, fallback) =>
  Object.prototype.hasOwnProperty.call(allowed, value) ? value : fallback;

function normalizeProps(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((p) => ({ name: pick(p?.name, PROPS, null), place: pick(p?.place, PLACES, "ground") }))
    .filter((p) => p.name)
    .slice(0, 2);
}

/** 把一段拆成 1~3 个分镜（beat）。weight 是该句在整段中的字数占比，用来分配旁白时间。 */
function normalizeBeats(rawBeats, text, sceneDefaults) {
  const beats = (Array.isArray(rawBeats) ? rawBeats : []).slice(0, 3).map((b) => ({
    text: String(b?.text || ""),
    heroAction: pick(b?.hero_action, ACTIONS, sceneDefaults.heroAction),
    friendAction: pick(b?.friend_action, ACTIONS, sceneDefaults.friendAction),
    props: normalizeProps(b?.props),
  }));
  if (beats.length === 0) {
    return [{ weight: 1, heroAction: sceneDefaults.heroAction, friendAction: sceneDefaults.friendAction, props: [] }];
  }
  const lens = beats.map((b) => (b.text && text.includes(b.text) ? b.text.length : 0));
  const sum = lens.reduce((a, b) => a + b, 0);
  return beats.map((b, i) => ({
    weight: sum > 0 && lens.every((l) => l > 0) ? lens[i] / sum : 1 / beats.length,
    heroAction: b.heroAction,
    friendAction: b.friendAction,
    props: b.props,
  }));
}

// 4 段故事的默认情绪动作：平静 → 紧张 → 尝试 → 温暖
const DEFAULT_ACTIONS = [
  ["walk", "wave"],
  ["sad", "think"],
  ["hop", "hop"],
  ["dance", "dance"],
];

/** 把大模型输出（可能不规范）整理成播放器能用的结构；任何字段不合法都回退到默认值。 */
export function normalizeScenes(raw, input) {
  const paragraphs = (Array.isArray(raw?.paragraphs) ? raw.paragraphs : [])
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;

  const hero = pick(raw?.hero, CHARACTERS, guessCharacter(input.character));
  let friend = raw?.friend == null ? null : pick(raw.friend, CHARACTERS, null);
  if (friend === hero) friend = null;
  const defaultBg = guessBackground(input.scene);
  const rawScenes = Array.isArray(raw?.scenes) ? raw.scenes : [];

  const scenes = paragraphs.map((text, i) => {
    const s = rawScenes[i] || {};
    const [dh, df] = DEFAULT_ACTIONS[Math.min(i, DEFAULT_ACTIONS.length - 1)];
    const heroAction = pick(s.hero_action, ACTIONS, dh);
    const friendAction = pick(s.friend_action, ACTIONS, df);
    return {
      text,
      bg: pick(s.bg, BACKGROUNDS, defaultBg),
      effect: pick(s.effect, EFFECTS, "none"),
      friendPresent: Boolean(friend) && s.friend_present !== false,
      heroAction,
      friendAction,
      beats: normalizeBeats(s.beats, text, { heroAction, friendAction }),
    };
  });

  return { hero, friend, scenes };
}

/** 大模型没给出可用 JSON 时：按段落拆分纯文本故事，用关键词猜画面。 */
export function fallbackScenes(story, input) {
  const paragraphs = String(story || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  const base = normalizeScenes({ paragraphs }, input);
  // 每段再用自身文字猜一次场景（比如第4段写到“月亮出来了”就切到夜晚）
  base.scenes.forEach((s) => {
    s.bg = guessBackground(s.text, s.bg);
  });
  return base;
}

/** 从模型回复里取出第一个 JSON 对象（兼容 ```json 代码块）。 */
export function extractJson(content) {
  const s = String(content || "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
