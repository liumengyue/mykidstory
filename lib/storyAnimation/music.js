// 原创背景音乐：浏览器里直接合成一段 16 小节（38.4 秒）的循环，无需音频文件、无版权问题。
const BPM = 100;
const BEAT = 60 / BPM;
const LOOP_BEATS = 64;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function synthLoop(audioCtx) {
  const sr = audioCtx.sampleRate;
  const len = Math.floor(LOOP_BEATS * BEAT * sr);
  const buf = audioCtx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);

  const add = (t0, note, dur, vol, kind) => {
    const i0 = Math.floor(t0 * sr);
    const n = Math.min(Math.floor(dur * sr), len - i0);
    const f = midi(note);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let env;
      let w;
      if (kind === "bass") {
        env = Math.exp(-t * 3) * Math.min(1, t * 100);
        w = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
      } else if (kind === "pad") {
        env = Math.min(1, t * 2) * Math.min(1, (dur - t) * 2);
        w = Math.sin(2 * Math.PI * f * t);
      } else {
        env = Math.exp(-t * 5) * Math.min(1, t * 200);
        w = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(8 * Math.PI * f * t) * Math.exp(-t * 12);
      }
      out[(i0 + i) % len] += vol * env * w;
    }
  };
  const kick = (t0, vol) => {
    const i0 = Math.floor(t0 * sr);
    const n = Math.min(Math.floor(0.25 * sr), len - i0);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      phase += (2 * Math.PI * (120 * Math.exp(-t * 20) + 45)) / sr;
      out[i0 + i] += vol * Math.sin(phase) * Math.exp(-t * 12);
    }
  };

  const [C, D, E, G, A] = [72, 74, 76, 79, 81];
  const phraseA = [[0, E, 1], [1, G, 1], [2, A, 1], [3, G, 1], [4, E, 1], [5, D, 1], [6, C, 2],
    [8, D, 1], [9, E, 1], [10, G, 1], [11, E, 1], [12, D, 1], [13, C, 1], [14, D, 2]];
  const phraseB = [[0, G, 1], [1, A, 1], [2, G, 1], [3, E, 1], [4, D, 1], [5, E, 1], [6, G, 2],
    [8, A, 1], [9, G, 1], [10, E, 1], [11, D, 1], [12, E, 1], [13, D, 1], [14, C, 2]];
  const roots = [48, 45, 41, 43];
  const pads = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];

  for (let b = 0; b < LOOP_BEATS; b++) {
    const t = b * BEAT;
    const ch = Math.floor(b / 4) % 4;
    if (b % 4 === 0) {
      add(t, roots[ch], BEAT * 4, 0.25, "bass");
      pads[ch].forEach((p) => add(t, p, BEAT * 4, 0.04, "pad"));
    }
    kick(t, b % 2 === 0 ? 0.35 : 0.2);
  }
  for (let k = 0; k < LOOP_BEATS / 16; k++) {
    const ph = k % 2 === 0 ? phraseA : phraseB;
    ph.forEach(([off, note, beats]) => {
      add((k * 16 + off) * BEAT, note, beats * BEAT * 1.2, 0.22, "mallet");
      add((k * 16 + off) * BEAT, note - 12, beats * BEAT * 1.2, 0.06, "mallet");
    });
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  const norm = 0.8 / (peak || 1);
  for (let i = 0; i < len; i++) out[i] *= norm;
  return buf;
}

/** 循环播放背景音乐；setLevel 平滑调整音量（跳舞时大声，讲故事时很小声）。 */
export function startMusic(audioCtx, buffer) {
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const gain = audioCtx.createGain();
  gain.gain.value = 0;
  src.connect(gain).connect(audioCtx.destination);
  src.start();
  let current = 0;
  return {
    setLevel(level) {
      if (Math.abs(level - current) < 0.001) return;
      current = level;
      gain.gain.setTargetAtTime(level, audioCtx.currentTime, 0.4);
    },
    stop() {
      try {
        src.stop();
      } catch {}
      src.disconnect();
      gain.disconnect();
    },
  };
}
