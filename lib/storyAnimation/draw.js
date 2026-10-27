// Canvas 绘制：背景、角色、动作。逻辑画布 1280x720，所有函数都是纯函数（输入时间 → 画面）。
export const W = 1280;
export const H = 720;
export const BEAT = 0.6; // 100 BPM，与背景音乐一致
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
export const seg = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;

function ell(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function poly(ctx, pts, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function line(ctx, x0, y0, x1, y1, color, width) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
}

export function outlinedText(ctx, s, x, y, size, color, alpha = 1, maxWidth = W - 80) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.18;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(s, x, y, maxWidth);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y, maxWidth);
  ctx.restore();
}

/** 旁白字幕：底部半透明条，自动换行，最多 3 行。 */
export function caption(ctx, text, alpha) {
  if (!text || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold 34px ${FONT}`;
  const maxW = W - 200;
  const lines = [];
  let cur = "";
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) {
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 3);
  const boxH = shown.length * 48 + 28;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  roundRect(ctx, 80, H - boxH - 20, W - 160, boxH, 24);
  ctx.fill();
  ctx.fillStyle = "#4a3b2a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  shown.forEach((l, i) => ctx.fillText(l, W / 2, H - boxH - 20 + 38 + i * 48));
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ============ 背景 ============ */

function sky(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return g;
}

function sun(ctx, t, sx = 1060, sy = 130) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.3);
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 6);
    poly(ctx, [[70, -8], [100, 0], [70, 8]], "#ffd23f");
    ctx.restore();
  }
  ctx.restore();
  ell(ctx, sx, sy, 62, 62, "#ffd23f");
  ell(ctx, sx, sy, 50, 50, "#ffe066");
  const blink = t % 4 < 0.15 ? 0.15 : 1;
  ell(ctx, sx - 18, sy - 6, 5, 7 * blink, "#5a3e1b");
  ell(ctx, sx + 18, sy - 6, 5, 7 * blink, "#5a3e1b");
  ell(ctx, sx - 30, sy + 12, 9, 5, "rgba(255,143,163,0.7)");
  ell(ctx, sx + 30, sy + 12, 9, 5, "rgba(255,143,163,0.7)");
  ctx.beginPath();
  ctx.arc(sx, sy + 8, 14, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = "#5a3e1b";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();
}

function clouds(ctx, t, color = "rgba(255,255,255,0.95)") {
  [[200, 110, 1.0], [620, 70, 0.8], [900, 220, 0.6]].forEach(([cx0, cy, s], i) => {
    const cx = ((cx0 + t * 8 * (1 + i * 0.3)) % (W + 300)) - 150;
    [[-40, 10, 35], [0, 0, 48], [45, 8, 38], [10, 20, 40]].forEach(([dx, dy, r]) =>
      ell(ctx, cx + dx * s, cy + dy * s, r * s * 1.3, r * s, color)
    );
  });
}

function tree(ctx, tx, ts, t, leaf = "#4caf50") {
  const sway = Math.sin(t * 1.2 + tx) * 3;
  ctx.fillStyle = "#9c6b3c";
  ctx.fillRect(tx - 12 * ts, 430 - 20 * ts, 24 * ts, 120 * ts);
  [[0, -110, 70], [-45, -70, 55], [45, -70, 55], [0, -50, 60]].forEach(([dx, dy, r]) =>
    ell(ctx, tx + dx * ts + sway, 430 + dy * ts, r * ts, r * ts * 0.9, leaf)
  );
}

function flowers(ctx, t, beatOn) {
  const k = beatOn ? 0.5 + 0.5 * Math.cos((2 * Math.PI * t) / BEAT) : 0;
  [[60, 640, "#ff6fa3"], [170, 690, "#ffd23f"], [1110, 650, "#b58cff"], [1220, 700, "#ff6fa3"],
   [240, 600, "#ff9e40"], [1040, 600, "#ffd23f"]].forEach(([fx, fy, col], i) => {
    const bob = k * 6 * (i % 2 ? 1 : -1) * 0.5;
    line(ctx, fx, fy + 40, fx + bob, fy, "#3e8e41", 5);
    for (let p = 0; p < 5; p++) {
      const a = (p * 2 * Math.PI) / 5 + t * 0.5;
      ell(ctx, fx + bob + Math.cos(a) * 13, fy + Math.sin(a) * 13, 10, 10, col);
    }
    ell(ctx, fx + bob, fy, 8, 8, "#fff3b0");
  });
}

function stars(ctx, t) {
  for (let i = 0; i < 40; i++) {
    const x = (i * 337) % W;
    const y = (i * 151) % 380;
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    ell(ctx, x, y, 2 + tw * 2, 2 + tw * 2, `rgba(255,248,200,${0.4 + tw * 0.6})`);
  }
}

const BG = {
  forest(ctx, t, beatOn) {
    sky(ctx, "#8fd3ff", "#dff4ff");
    clouds(ctx, t);
    sun(ctx, t);
    ctx.beginPath();
    ctx.moveTo(0, 460);
    ctx.bezierCurveTo(250, 380, 450, 380, 700, 450);
    ctx.bezierCurveTo(900, 500, 1100, 380, W, 430);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fillStyle = "#9ad46b";
    ctx.fill();
    [[90, 1.1], [300, 0.8], [1180, 1.0], [980, 0.75]].forEach(([x, s]) => tree(ctx, x, s, t));
    ground(ctx, "#7cc35a", "rgba(182,227,136,0.9)");
    flowers(ctx, t, beatOn);
  },
  city(ctx, t) {
    sky(ctx, "#9fd8ff", "#eaf7ff");
    clouds(ctx, t);
    sun(ctx, t, 1120, 110);
    const cols = ["#ffb3c7", "#ffd98a", "#a8e0c8", "#b9c7ff", "#ffc49b", "#d6b8ff"];
    [[40, 200], [210, 150], [380, 230], [760, 170], [930, 120], [1100, 210]].forEach(([x, top], i) => {
      ctx.fillStyle = cols[i];
      roundRect(ctx, x, top + 150, 150, 400, 14);
      ctx.fill();
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 3; c++) {
          const lit = (r + c + i) % 3 === 0;
          ctx.fillStyle = lit ? "#fff6c2" : "rgba(255,255,255,0.75)";
          roundRect(ctx, x + 18 + c * 44, top + 180 + r * 56, 28, 34, 6);
          ctx.fill();
        }
    });
    ctx.fillStyle = "#c9c9d6"; // 人行道
    ctx.fillRect(0, 530, W, H - 530);
    ctx.fillStyle = "#b5b5c4";
    for (let x = 0; x < W; x += 80) ctx.fillRect(x, 530, 4, H - 530);
    ell(ctx, 640, 600, 430, 60, "rgba(255,255,255,0.35)");
    tree(ctx, 600, 0.6, t);
  },
  beach(ctx, t) {
    sky(ctx, "#7fd0ff", "#e6f8ff");
    clouds(ctx, t);
    sun(ctx, t);
    ctx.fillStyle = "#4fb3e8";
    ctx.fillRect(0, 380, W, 140);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) {
        const y = 400 + i * 40 + Math.sin(x / 60 + t * 1.5 + i) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.bezierCurveTo(400, 495, 880, 495, W, 520);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fillStyle = "#ffe2a8";
    ctx.fill();
    // 贝壳和海星
    [[150, 650, "#ff9fb0"], [1120, 640, "#ffb36b"], [260, 700, "#c7a2ff"]].forEach(([x, y, c]) => {
      for (let p = 0; p < 5; p++) {
        const a = (p * 2 * Math.PI) / 5 - Math.PI / 2;
        poly(ctx, [[x, y], [x + Math.cos(a - 0.3) * 10, y + Math.sin(a - 0.3) * 10],
          [x + Math.cos(a) * 26, y + Math.sin(a) * 26], [x + Math.cos(a + 0.3) * 10, y + Math.sin(a + 0.3) * 10]], c);
      }
    });
  },
  night(ctx, t, beatOn) {
    const g = sky(ctx, "#1f2a5c", "#4a5fa8");
    stars(ctx, t);
    // 月牙：用天空同一个渐变盖住一部分圆，颜色严丝合缝
    ell(ctx, 1060, 130, 60, 60, "#fff4c2");
    ell(ctx, 1085, 115, 52, 52, g);
    ctx.beginPath();
    ctx.moveTo(0, 470);
    ctx.bezierCurveTo(300, 400, 600, 420, 800, 460);
    ctx.bezierCurveTo(1000, 500, 1150, 420, W, 450);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fillStyle = "#3b6b4a";
    ctx.fill();
    [[110, 1.0], [1170, 0.9]].forEach(([x, s]) => tree(ctx, x, s, t, "#2f7a45"));
    ground(ctx, "#4d8a5a", "rgba(120,170,130,0.6)");
    // 萤火虫
    for (let i = 0; i < 8; i++) {
      const x = 200 + ((i * 137 + t * 20) % 900);
      const y = 380 + Math.sin(t + i) * 60;
      ell(ctx, x, y, 5, 5, `rgba(255,250,150,${0.5 + 0.5 * Math.sin(t * 3 + i)})`);
    }
    if (beatOn) flowers(ctx, t, beatOn);
  },
  home(ctx, t) {
    ctx.fillStyle = "#ffeedd";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe0c4"; // 墙纸条纹
    for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 30, 520);
    // 窗户
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 880, 90, 280, 220, 18);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 895, 105, 250, 190, 12);
    ctx.clip();
    sky(ctx, "#8fd3ff", "#dff4ff");
    clouds(ctx, t);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(1015, 105, 10, 190);
    ctx.fillRect(895, 195, 250, 10);
    // 画框
    ctx.fillStyle = "#ffcf6b";
    roundRect(ctx, 140, 120, 180, 140, 12);
    ctx.fill();
    ctx.fillStyle = "#bfe7ff";
    ctx.fillRect(160, 140, 140, 100);
    ell(ctx, 230, 200, 30, 22, "#ff9fb0");
    // 地板和地毯
    ctx.fillStyle = "#e0b088";
    ctx.fillRect(0, 520, W, H - 520);
    ell(ctx, 640, 610, 420, 75, "#ffb3cf");
    ell(ctx, 640, 610, 360, 58, "#ffd1e1");
  },
};

function ground(ctx, color, floor) {
  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.bezierCurveTo(400, 515, 880, 515, W, 540);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fillStyle = color;
  ctx.fill();
  ell(ctx, 640, 600, 430, 70, floor);
}

export function drawBackground(ctx, bg, t, beatOn) {
  (BG[bg] || BG.forest)(ctx, t, beatOn);
}

export function musicNotes(ctx, t) {
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.35 + i * 0.25) % 1;
    const x = 160 + i * 300 + Math.sin(ph * 6 + i) * 25;
    const y = 470 - ph * 260;
    const a = Math.sin(ph * Math.PI) * 0.85;
    const col = ["255,111,163", "63,169,245", "155,107,255", "255,158,64"][i];
    ell(ctx, x, y, 11, 8, `rgba(${col},${a})`);
    line(ctx, x + 10, y, x + 10, y - 32, `rgba(${col},${a})`, 3);
    line(ctx, x + 10, y - 32, x + 22, y - 26, `rgba(${col},${a})`, 3);
  }
}

/* ============ 角色 ============ */
// 所有角色共用一套身体结构（身体 + 裙子 + 手臂 + 头），差异只在颜色、耳朵和脸部细节。
const LOOKS = {
  rabbit: { fur: "#fff6fb", inner: "#ffb3cf", skirt: ["#ff7eb6", "#ff4f9a"], bow: "#ff4f9a", ears: "long" },
  cat: { fur: "#ffb26b", inner: "#ffd9b3", skirt: ["#c49bff", "#9b6bff"], bow: "#ff6fa3", ears: "pointy", whiskers: true, tail: true, muzzle: true },
  duck: { fur: "#ffdd55", inner: "#ffcc33", skirt: ["#7fd1ff", "#3fa9f5"], bow: "#3fa9f5", ears: "tuft", beak: true, wings: true, feet: "#ff9a3c" },
  bear: { fur: "#c58b5a", inner: "#e8c39e", skirt: ["#ffd23f", "#ffa83f"], bow: "#ff6fa3", ears: "round", muzzle: true },
  dog: { fur: "#f3e1c7", inner: "#a8774f", muzzleColor: "#fffaf2", skirt: ["#7ee0b0", "#3cc48a"], bow: "#ff9e40", ears: "floppy", muzzle: true, spot: true },
  pig: { fur: "#ffc4d3", inner: "#ff9fb7", skirt: ["#9fd8ff", "#6bb8ff"], bow: "#ff6fa3", ears: "pig", snout: true, tail: true },
};

function skirt(ctx, x, y, w, h, c1, c2, swish) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.45, y);
  ctx.lineTo(x + w * 0.45, y);
  ctx.lineTo(x + w + swish, y + h);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const xa = x + w + swish - ((i + 1) * 2 * w) / n;
    ctx.bezierCurveTo(xa + ((2 * w) / n) * 0.7, y + h + 16, xa + ((2 * w) / n) * 0.3, y + h + 16, xa, y + h);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fill();
  for (let i = 0; i < 5; i++) ell(ctx, x - w * 0.6 + i * w * 0.3 + swish * 0.6, y + h * 0.6, 4, 4, "rgba(255,255,255,0.85)");
}

function limb(ctx, x0, y0, ang, len, col, wing) {
  if (wing) {
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(ang - Math.PI / 2);
    ell(ctx, 0, 22, 13, 28, col);
    ctx.restore();
    return;
  }
  const x1 = x0 + Math.cos(ang) * len;
  const y1 = y0 + Math.sin(ang) * len;
  line(ctx, x0, y0, x1, y1, col, 11);
  ell(ctx, x1, y1, 8, 8, col);
}

function face(ctx, L, t, seed, pose) {
  const hy = -135;
  // 眼睛（难过时眉毛下垂、睡觉时闭眼）
  const sleeping = pose.eyesClosed;
  const blink = sleeping || (t + seed) % 3.7 < 0.14 ? 0.15 : 1;
  for (const dx of [-17, 17]) {
    if (sleeping) {
      ctx.beginPath();
      ctx.arc(dx, hy - 4, 7, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = "#2d2d2d";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ell(ctx, dx, hy - 5, 7, 9 * blink, "#2d2d2d");
      if (blink > 0.5) ell(ctx, dx + 2.5, hy - 8, 2.5, 2.5, "#ffffff");
    }
  }
  if (pose.sad) {
    line(ctx, -26, hy - 22, -10, hy - 18, "#2d2d2d", 3);
    line(ctx, 26, hy - 22, 10, hy - 18, "#2d2d2d", 3);
  }
  ell(ctx, -30, hy + 13, 10, 6, "rgba(255,143,163,0.75)");
  ell(ctx, 30, hy + 13, 10, 6, "rgba(255,143,163,0.75)");
  if (L.muzzle) ell(ctx, 0, hy + 17, 24, 16, L.muzzleColor || L.inner);
  if (L.whiskers) {
    for (const s of [-1, 1])
      for (const dy of [-4, 4]) line(ctx, s * 26, hy + 15 + dy, s * 48, hy + 13 + dy * 2, "#8a5a2b", 2);
  }
  if (L.beak) {
    ell(ctx, 0, hy + 23, 20, 9 + (pose.mouth || 0) * 5, "#ff9a3c");
    line(ctx, -18, hy + 23, 18, hy + 23, "#e07b20", 2);
    return;
  }
  if (L.snout) {
    ell(ctx, 0, hy + 12, 18, 12, L.inner);
    ell(ctx, -6, hy + 12, 3, 4, "#c76b84");
    ell(ctx, 6, hy + 12, 3, 4, "#c76b84");
  } else {
    ell(ctx, 0, hy + 8, 5, 4, L.muzzle ? "#5a3e1b" : "#ff7eb6");
  }
  // 嘴巴
  const my = hy + 24;
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  if (pose.sad) {
    ctx.beginPath();
    ctx.arc(0, my + 8, 8, Math.PI + 0.4, -0.4);
    ctx.stroke();
  } else if (pose.mouth > 0.3) {
    ctx.beginPath();
    ctx.moveTo(-9, my);
    ctx.bezierCurveTo(-9, my + 12, 9, my + 12, 9, my);
    ctx.closePath();
    ctx.fillStyle = "#e8505b";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, my - 4, 9, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
}

function ears(ctx, L, pose) {
  const f = L.fur;
  const wig = pose.ear || 0;
  switch (L.ears) {
    case "long":
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 18, -150);
        ctx.rotate(s * (0.15 + wig));
        ell(ctx, 0, -45, 16, 48, f);
        ell(ctx, 0, -45, 8, 36, L.inner);
        ctx.restore();
      }
      break;
    case "pointy":
      for (const s of [-1, 1]) {
        poly(ctx, [[s * 14, -165], [s * 44, -200], [s * 46, -145]], f);
        poly(ctx, [[s * 20, -163], [s * 40, -188], [s * 41, -152]], L.inner);
      }
      break;
    case "round":
      for (const s of [-1, 1]) {
        ell(ctx, s * 38, -170, 20, 20, f);
        ell(ctx, s * 38, -170, 11, 11, L.inner);
      }
      break;
    case "floppy":
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 42, -150);
        ctx.rotate(s * (0.35 + wig));
        ell(ctx, 0, 22, 16, 34, L.inner);
        ctx.restore();
      }
      break;
    case "pig":
      for (const s of [-1, 1]) poly(ctx, [[s * 18, -168], [s * 46, -186], [s * 42, -150]], L.inner);
      break;
    case "tuft":
      for (let i = 0; i < 3; i++) ell(ctx, -8 + i * 8, -176 - (i === 1 ? 6 : 0), 6, 12, f);
      break;
  }
}

/** 画一个角色。pose 由 actionPose() 生成。 */
export function drawCharacter(ctx, type, x, y, t, pose, seed = 0) {
  const L = LOOKS[type] || LOOKS.rabbit;
  const s = pose.scale ?? 1;
  ctx.save();
  // 影子
  const lift = Math.min(Math.abs(pose.dy || 0), 40) / 120;
  ell(ctx, x, 605, 50 * (1 - lift), 10 * (1 - lift), "rgba(45,90,30,0.22)");
  ctx.translate(x, y + (pose.dy || 0));
  ctx.scale(s * (pose.flip ?? 1), s * (pose.squash ?? 1));
  ctx.rotate(pose.tilt || 0);

  if (L.tail) {
    const tw = Math.sin(t * 3 + seed) * 20;
    ctx.beginPath();
    ctx.moveTo(30, -40);
    ctx.bezierCurveTo(80, -50, 70 + tw, -120, 50 + tw, -130);
    ctx.strokeStyle = L.fur;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  // 脚
  for (const dx of [-17, 17]) {
    const step = pose.walk ? Math.sin(t * 8 + (dx > 0 ? Math.PI : 0)) * 6 : 0;
    if (L.feet) ell(ctx, dx, -6 - Math.max(0, step), 20, 9, L.feet);
    else ell(ctx, dx, -10 - Math.max(0, step), 16, 12, L.fur);
  }
  ell(ctx, 0, -58, 38, 44, L.fur);
  skirt(ctx, 0, -68, 58, 48, L.skirt[0], L.skirt[1], pose.swish || 0);
  limb(ctx, -28, -78, pose.armL ?? 2.3, 40, L.wings ? L.inner : L.fur, L.wings);
  limb(ctx, 28, -78, pose.armR ?? 0.8, 40, L.wings ? L.inner : L.fur, L.wings);
  ears(ctx, L, pose);
  ell(ctx, 0, -135, 48, 44, L.fur);
  if (L.spot) ell(ctx, 22, -150, 16, 13, L.inner);
  // 蝴蝶结
  for (const sg of [-1, 1]) poly(ctx, [[-26, -172], [-26 + sg * 18, -184], [-26 + sg * 18, -160]], L.bow);
  ell(ctx, -26, -172, 5, 5, "#ffd23f");
  face(ctx, L, t, seed, pose);
  ctx.restore();

  if (pose.zzz) {
    const ph = (t * 0.5) % 1;
    outlinedText(ctx, "Z", x + 50 + ph * 30, y - 200 - ph * 60, 30 + ph * 14, "#6b7bd6", Math.sin(ph * Math.PI));
  }
  if (pose.thinking) {
    for (let i = 0; i < 3; i++) ell(ctx, x + 55 + i * 18, y - 190 - i * 22, 5 + i * 3, 5 + i * 3, "rgba(255,255,255,0.95)");
    outlinedText(ctx, "?", x + 120, y - 270, 46, "#ff9e40", 0.6 + 0.4 * Math.sin(t * 3));
  }
}

/* ============ 动作 ============ */

/** 根据动作名和该动作已持续的时间 lt 生成姿势。phase 让两个角色不完全同步，看起来更自然。 */
export function actionPose(action, lt, phase = 0) {
  const b = lt / BEAT;
  const hop = Math.abs(Math.sin(Math.PI * b + phase));
  switch (action) {
    case "walk":
      return { walk: true, tilt: Math.sin(lt * 4) * 0.06, dy: -Math.abs(Math.sin(lt * 4)) * 6, swish: Math.sin(lt * 4) * 8, armL: 2.0 + Math.sin(lt * 4) * 0.4, armR: 1.1 - Math.sin(lt * 4) * 0.4, mouth: 0 };
    case "hop":
      return { dy: -hop * 34, squash: 1 - (1 - hop) * 0.06, armL: -2.4, armR: -0.7, swish: hop * 10, mouth: 1 };
    case "wave":
      return { armR: -1.2 + Math.sin(lt * 7) * 0.45, armL: 2.3, tilt: Math.sin(lt * 2) * 0.05, mouth: 1 };
    case "sad":
      return { sad: true, tilt: 0.06, dy: 4, armL: 1.9, armR: 1.2, ear: 0.35 + Math.sin(lt) * 0.05 };
    case "think":
      return { thinking: true, tilt: Math.sin(lt * 1.5) * 0.08, armL: 2.2, armR: -0.4, mouth: 0 };
    case "hug":
      return { armL: -0.4 + Math.sin(lt * 2) * 0.1, armR: Math.PI + 0.4 - Math.sin(lt * 2) * 0.1, tilt: Math.sin(lt * 1.5) * 0.06, mouth: 1 };
    case "sleep":
      return { eyesClosed: true, zzz: true, tilt: 0.12, dy: Math.sin(lt * 1.5) * 2, armL: 2.0, armR: 1.1 };
    case "dance":
      return dancePose(lt, phase);
    case "bow": {
      const k = Math.sin(seg(lt, 0.2, 2) * Math.PI);
      return { scale: 1 - 0.08 * k, dy: k * 12, armL: 2.0, armR: 1.1 };
    }
    case "idle":
    default:
      return { dy: -Math.abs(Math.sin((Math.PI * lt) / BEAT)) * 5, tilt: Math.sin(lt * 2 + phase) * 0.04, mouth: 0 };
  }
}

/** 跳舞：每 4 拍（2.4 秒）换一个动作，动作慢、重复，方便孩子跟着跳。 */
function dancePose(lt, phase) {
  const b = lt / BEAT;
  const move = Math.floor(lt / (BEAT * 4)) % 4;
  const k = Math.sin(2 * Math.PI * (b / 2) + phase * 0.2);
  const hop = Math.abs(Math.sin(Math.PI * b));
  if (move === 0) return { tilt: k * 0.12, armL: -2.2 + k * 0.3, armR: -0.9 + k * 0.3, swish: k * 14, mouth: 1 };
  if (move === 1) return { armL: -2.5, armR: -0.6, swish: hop * 8, dy: -hop * 28, mouth: 1 };
  if (move === 2) return { tilt: k * 0.08, armL: -1.2 + hop * 0.6, armR: -1.9 - hop * 0.6, swish: k * 18, dx: k * 30, mouth: 0 };
  const ph = (lt % (BEAT * 4)) / (BEAT * 4);
  return { flip: Math.cos(ph * 2 * Math.PI), armL: 2.8, armR: 0.3, swish: 12, dy: -Math.sin(ph * Math.PI) * 15, mouth: 1 };
}

export { lerp, seg as segment };
