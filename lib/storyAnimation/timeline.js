// 把分镜 + 每段旁白时长 → 时间轴；renderFrame(t) 按时间轴画出任意时刻的画面。
import {
  W, drawBackground, drawCharacter, actionPose, musicNotes, caption, outlinedText, seg,
  drawProp, drawTallTree, drawEffect, TALL_TREE_TOP,
} from "./draw";

// 可调参数：每段旁白后的舞蹈时长、结尾大合舞时长（秒）
export const DANCE_SECONDS = 28;
export const FINALE_SECONDS = 30;
const INTRO_SECONDS = 4;
const BOW_SECONDS = 3;
const NARRATION_PAD = 1.0; // 旁白前后留白

const HERO_X = 470;
const FRIEND_X = 810;
const GROUND_Y = 600;

/** 估算没有配音时一段文字的朗读时长（0.85 倍速约 4 字/秒）。 */
export const estimateSeconds = (text) => Math.max(5, String(text).length / 4);

/**
 * @param animation {hero, friend, scenes:[{text,bg,friendPresent,heroAction,friendAction}]}
 * @param narration 每段旁白的秒数（数组，与 scenes 对应）
 */
export function buildTimeline(animation, narration) {
  const segs = [];
  let t = 0;
  const push = (s) => {
    segs.push({ ...s, start: t, end: t + s.duration });
    t += s.duration;
  };
  const first = animation.scenes[0];
  push({ kind: "intro", duration: INTRO_SECONDS, bg: first.bg, friendPresent: false });

  let friendShown = false;
  animation.scenes.forEach((sc, i) => {
    const friendEnters = sc.friendPresent && !friendShown;
    if (sc.friendPresent) friendShown = true;
    const duration = narration[i] + NARRATION_PAD * 2;
    // 每个分镜按句子字数占比分到旁白时间；第一个分镜从段落开头算起
    const rawBeats = sc.beats && sc.beats.length
      ? sc.beats
      : [{ weight: 1, heroAction: sc.heroAction, friendAction: sc.friendAction, props: [] }];
    let acc = 0;
    const beats = rawBeats.map((b, j) => {
      const start = j === 0 ? 0 : NARRATION_PAD + narration[i] * acc;
      acc += b.weight;
      const end = j === rawBeats.length - 1 ? duration : NARRATION_PAD + narration[i] * acc;
      return { ...b, start, end };
    });
    const allProps = beats.flatMap((b) => b.props || []);
    push({
      kind: "narration",
      index: i,
      duration,
      voiceAt: NARRATION_PAD,
      bg: sc.bg,
      effect: sc.effect || "none",
      text: sc.text,
      friendPresent: sc.friendPresent,
      friendEnters,
      beats,
      tree: allProps.some((p) => p.place === "high" || p.place === "fall"),
    });
    // 最后一段讲完直接进入大合舞，不重复插舞蹈
    if (i < animation.scenes.length - 1) {
      push({ kind: "dance", duration: DANCE_SECONDS, bg: sc.bg, friendPresent: sc.friendPresent });
    }
  });
  const last = animation.scenes[animation.scenes.length - 1];
  const finaleFriend = Boolean(animation.friend);
  push({ kind: "finale", duration: FINALE_SECONDS, bg: last.bg, friendPresent: finaleFriend });
  push({ kind: "bow", duration: BOW_SECONDS, bg: last.bg, friendPresent: finaleFriend });
  push({ kind: "end", duration: Infinity, bg: last.bg, friendPresent: finaleFriend });

  return {
    segments: segs,
    total: t,
    hero: animation.hero,
    friend: animation.friend,
    introTargetX: first.friendPresent && animation.friend ? HERO_X : W / 2,
  };
}

export function segmentAt(timeline, t) {
  const segs = timeline.segments;
  for (const s of segs) if (t < s.end) return s;
  return segs[segs.length - 1];
}

/** 是否处于"音乐大声"的段落（跳舞），给音乐音量用。 */
export const isDancing = (s) => s.kind === "dance" || s.kind === "finale" || s.kind === "intro";

export function renderFrame(ctx, timeline, t) {
  const s = segmentAt(timeline, t);
  const lt = t - s.start;
  const dancing = s.kind === "dance" || s.kind === "finale";
  drawBackground(ctx, s.bg, t, dancing);
  if (dancing) musicNotes(ctx, t);

  // ---- 角色位置与动作 ----
  const friend = timeline.friend;
  const duo = Boolean(friend && s.friendPresent);
  // 只有主角时站中间；有配角时左右分开
  let heroX = duo ? HERO_X : W / 2;
  let friendX = FRIEND_X;
  let heroPose;
  let friendPose;
  let beat = null;

  switch (s.kind) {
    case "intro":
      // 入场终点与第一幕站位一致，避免切换时跳动
      heroX = -150 + (timeline.introTargetX + 150) * seg(lt, 0.3, 3.3);
      heroPose = lt < 3.3 ? actionPose("walk", lt) : actionPose("wave", lt);
      break;
    case "narration": {
      beat = s.beats.find((b) => lt < b.end) || s.beats[s.beats.length - 1];
      const blt = lt - beat.start;
      heroPose = actionPose(beat.heroAction, blt, 0);
      friendPose = actionPose(beat.friendAction, blt, 0.8);
      if (s.tree) {
        // 有大树时整体往右挪，主角靠近树
        const k = seg(lt, 0, 1.2);
        heroX += ((duo ? 560 : 820) - heroX) * k;
        friendX += (850 - friendX) * k;
      }
      if (s.friendEnters && duo) {
        const k = seg(lt, 0, 2.5);
        friendX = 1430 - (1430 - friendX) * k;
        if (k < 1) friendPose = { ...actionPose("walk", lt), flip: -1 };
      }
      if (duo && (beat.heroAction === "hug" || beat.friendAction === "hug")) {
        const k = seg(blt, 0.3, 1.8);
        const gap = friendX - heroX;
        heroX += (gap / 2 - 120) * k;
        friendX -= (gap / 2 - 120) * k;
      }
      break;
    }
    case "dance":
    case "finale":
      heroPose = actionPose("dance", lt, 0);
      friendPose = actionPose("dance", lt, 0);
      break;
    case "bow":
      heroPose = actionPose("bow", lt);
      friendPose = actionPose("bow", lt);
      break;
    case "end":
      heroPose = actionPose("wave", lt);
      friendPose = actionPose("wave", lt, 1);
      break;
  }

  if (s.kind === "narration") {
    drawEffect(ctx, s.effect, t, "under");
    if (s.tree) drawTallTree(ctx, t);
  }

  const hx = heroX + (heroPose.dx || 0);
  drawCharacter(ctx, timeline.hero, hx, GROUND_Y, t, heroPose, 0.3);
  let fx = friendX;
  if (duo && friendPose) {
    // 配角面向主角
    const fp = { ...friendPose, flip: (friendPose.flip ?? 1) * -1 };
    fx = friendX + (friendPose.dx || 0);
    drawCharacter(ctx, friend, fx, GROUND_Y, t, fp, 1.7);
  }

  if (s.kind === "narration" && beat) {
    drawBeatProps(ctx, s, beat, t, t - s.start, {
      hero: { x: hx, pose: heroPose, dir: 1 },
      friend: duo ? { x: fx, pose: friendPose, dir: -1 } : null,
    });
    drawEffect(ctx, s.effect, t, "over");
  }

  // ---- 文字 ----
  if (s.kind === "intro") {
    outlinedText(ctx, "故事开始啦！", W / 2, 230, 84, "#ff4f9a", seg(lt, 0.2, 1) * (1 - seg(lt, 3.2, 3.9)));
  }
  if (s.kind === "narration") {
    caption(ctx, s.text, seg(lt, 0.2, 0.8) * (1 - seg(lt, s.duration - 0.6, s.duration)));
  }
  if (s.kind === "dance" || s.kind === "finale") {
    const msg = s.kind === "finale" ? "大家一起跳舞吧！" : "跳一会儿舞吧！";
    outlinedText(ctx, msg, W / 2, 100, 64, "#ff7a00", seg(lt, 0.1, 0.7) * (1 - seg(lt, 2.6, 3.2)));
  }
  if (s.kind === "end") {
    outlinedText(ctx, "讲完啦！拜拜～", W / 2, 200, 84, "#ff4f9a", seg(lt, 0, 0.8));
  }

  // ---- 换场景时的柔和白色过渡 ----
  const segs = timeline.segments;
  const idx = segs.indexOf(s);
  const prev = segs[idx - 1];
  const next = segs[idx + 1];
  let white = 0;
  if (t < 0.8) white = 1 - seg(t, 0, 0.8);
  if (prev && prev.bg !== s.bg) white = Math.max(white, 1 - seg(lt, 0, 0.5));
  if (next && next.bg !== s.bg && Number.isFinite(s.end)) white = Math.max(white, seg(t, s.end - 0.5, s.end));
  if (white > 0) {
    ctx.fillStyle = `rgba(255,255,255,${white})`;
    ctx.fillRect(0, 0, W, 720);
  }
}

/* ============ 道具摆放 ============ */
// 太大、不能拿在手里的道具：放在角色旁边的地上
const BIG_PROPS = new Set(["cart", "ladder", "car", "boat"]);
// 用绳子牵着的道具：拿在手里时画在手的上方
const ON_STRING = new Set(["balloon", "kite"]);

function handOf(c) {
  const a = c.pose.armR ?? 0.8;
  return {
    x: c.x + c.dir * (28 + Math.cos(a) * 40),
    y: GROUND_Y + (c.pose.dy || 0) - 78 + Math.sin(a) * 40,
  };
}

function anchor(place, name, s, t, chars) {
  const hero = chars.hero;
  const friend = chars.friend;
  if (BIG_PROPS.has(name)) {
    if (name === "ladder" && s.tree) return { x: TALL_TREE_TOP.x - 85, y: 520 };
    if (name === "boat") return { x: hero.x + 150, y: 560 };
    const who = place === "friend" && friend ? friend : hero;
    return { x: who.x + who.dir * 120, y: 572 };
  }
  switch (place) {
    case "friend":
      if (friend) {
        const h = handOf(friend);
        return { x: h.x, y: h.y - (ON_STRING.has(name) ? 80 : 0) };
      }
    // 没有配角就落到主角手里
    // falls through
    case "hold": {
      const h = handOf(hero);
      return { x: h.x, y: h.y - (ON_STRING.has(name) ? 80 : 0) };
    }
    case "ground":
      return { x: friend ? (hero.x + friend.x) / 2 : hero.x + 120, y: 585 };
    case "between":
      return { x: friend ? (hero.x + friend.x) / 2 : hero.x + 100, y: 500 + Math.sin(t * 2) * 3 };
    case "high":
      return { x: TALL_TREE_TOP.x - 60, y: TALL_TREE_TOP.y + 40, rot: Math.sin(t * 2) * 0.15 };
    case "sky":
      return { x: 880, y: 170 + Math.sin(t * 1.5) * 10, rot: Math.sin(t) * 0.1 };
    default:
      return { x: hero.x + 120, y: 585 };
  }
}

function drawBeatProps(ctx, s, beat, t, lt, chars) {
  const bi = s.beats.indexOf(beat);
  const prev = bi > 0 ? s.beats[bi - 1] : null;
  const blt = lt - beat.start;
  for (const p of beat.props || []) {
    const before = prev?.props?.find((q) => q.name === p.name);
    const from = before ? anchor(before.place, p.name, s, t, chars) : anchor("hold", p.name, s, t, chars);
    let pos;
    if (p.place === "fly") {
      // 从原来的位置被风吹起来，往右上方飘走
      const k = seg(blt, 0, Math.min(4, beat.end - beat.start));
      pos = {
        x: from.x + 380 * k,
        y: from.y + (130 - from.y) * k + Math.sin(t * 3) * 20 * k,
        rot: Math.sin(t * 3) * 0.5 * k,
      };
      if (pos.x > W - 60) pos.x = W - 60;
    } else if (p.place === "fall") {
      // 从树上落到主角手里，带一点弹跳
      const top = anchor("high", p.name, s, t, chars);
      const to = anchor("hold", p.name, s, t, chars);
      const k = seg(blt, 0, 1.5);
      const bounce = k >= 1 ? 0 : Math.sin(k * Math.PI) * -60;
      pos = { x: top.x + (to.x - top.x) * k, y: top.y + (to.y - top.y) * k + bounce, rot: (1 - k) * Math.sin(t * 6) * 0.4 };
    } else {
      const to = anchor(p.place, p.name, s, t, chars);
      const k = before && before.place !== p.place ? seg(blt, 0, 1) : 1;
      pos = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, rot: to.rot || 0 };
    }
    // 新出现的道具轻轻弹出来
    const pop = before ? 1 : Math.min(1, seg(blt, 0, 0.5) * 1.15);
    const size = p.place === "between" ? 1.5 : 1; // 一起分享的东西画大一点
    drawProp(ctx, p.name, pos.x, pos.y, t, pop * size, pos.rot || 0);
  }
}
