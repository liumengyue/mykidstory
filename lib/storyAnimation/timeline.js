// 把分镜 + 每段旁白时长 → 时间轴；renderFrame(t) 按时间轴画出任意时刻的画面。
import { W, drawBackground, drawCharacter, actionPose, musicNotes, caption, outlinedText, seg } from "./draw";

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
    push({
      kind: "narration",
      index: i,
      duration: narration[i] + NARRATION_PAD * 2,
      voiceAt: NARRATION_PAD,
      bg: sc.bg,
      text: sc.text,
      friendPresent: sc.friendPresent,
      friendEnters,
      heroAction: sc.heroAction,
      friendAction: sc.friendAction,
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

  switch (s.kind) {
    case "intro":
      // 入场终点与第一幕站位一致，避免切换时跳动
      heroX = -150 + (timeline.introTargetX + 150) * seg(lt, 0.3, 3.3);
      heroPose = lt < 3.3 ? actionPose("walk", lt) : actionPose("wave", lt);
      break;
    case "narration": {
      heroPose = actionPose(s.heroAction, lt, 0);
      friendPose = actionPose(s.friendAction, lt, 0.8);
      if (s.friendEnters && duo) {
        const k = seg(lt, 0, 2.5);
        friendX = 1430 - (1430 - FRIEND_X) * k;
        if (k < 1) friendPose = { ...actionPose("walk", lt), flip: -1 };
      }
      if (duo && (s.heroAction === "hug" || s.friendAction === "hug")) {
        const k = seg(lt, 0.3, 1.8);
        heroX += 110 * k;
        friendX -= 110 * k;
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

  drawCharacter(ctx, timeline.hero, heroX + (heroPose.dx || 0), GROUND_Y, t, heroPose, 0.3);
  if (duo && friendPose) {
    // 配角面向主角
    const fp = { ...friendPose, flip: (friendPose.flip ?? 1) * -1 };
    drawCharacter(ctx, friend, friendX + (friendPose.dx || 0), GROUND_Y, t, fp, 1.7);
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
