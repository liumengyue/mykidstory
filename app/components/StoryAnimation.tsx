"use client";

import { useEffect, useRef, useState } from "react";
import { W, H } from "@/lib/storyAnimation/draw";
import { buildTimeline, renderFrame, segmentAt, isDancing, estimateSeconds } from "@/lib/storyAnimation/timeline";
import { synthLoop, startMusic } from "@/lib/storyAnimation/music";

export type StoryScene = {
  text: string;
  bg: string;
  friendPresent: boolean;
  heroAction: string;
  friendAction: string;
};

export type StoryAnimationData = {
  hero: string;
  friend: string | null;
  scenes: StoryScene[];
};

type Props = {
  animation: StoryAnimationData;
  /** 把一段文字转成 mp3 的 ArrayBuffer；失败时抛错，该段只显示字幕。 */
  fetchSpeech: (text: string) => Promise<ArrayBuffer>;
  onClose: () => void;
};

type Status = "ready" | "loading" | "playing" | "paused" | "ended";

type Timeline = ReturnType<typeof buildTimeline>;

export default function StoryAnimation({ animation, fetchSpeech, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [note, setNote] = useState("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const startAtRef = useRef(0);
  const voicesRef = useRef<(AudioBuffer | null)[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const musicRef = useRef<ReturnType<typeof startMusic> | null>(null);
  const musicBufRef = useRef<AudioBuffer | null>(null);
  const rafRef = useRef(0);

  // 未开始时显示第一帧作为封面
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const preview = buildTimeline(animation, animation.scenes.map((s) => estimateSeconds(s.text)));
    renderFrame(ctx, preview, 6); // 第一幕刚开始的画面
  }, [animation]);

  useEffect(() => () => teardown(true), []); // 卸载时释放音频

  function teardown(closeCtx: boolean) {
    cancelAnimationFrame(rafRef.current);
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {}
      s.disconnect();
    });
    sourcesRef.current = [];
    musicRef.current?.stop();
    musicRef.current = null;
    if (closeCtx) {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }

  async function start() {
    // AudioContext 必须在点击事件里创建/恢复，否则手机浏览器不出声
    let ac = audioCtxRef.current;
    if (!ac) {
      ac = new AudioContext();
      audioCtxRef.current = ac;
    }
    await ac.resume();
    wrapRef.current?.requestFullscreen?.().catch(() => {});

    if (!timelineRef.current) {
      setStatus("loading");
      setNote("正在准备故事声音…");
      const voices = await Promise.all(
        animation.scenes.map(async (s) => {
          try {
            const data = await fetchSpeech(s.text);
            return await ac!.decodeAudioData(data);
          } catch (e) {
            console.error("旁白生成失败，改用字幕", e);
            return null;
          }
        })
      );
      voicesRef.current = voices;
      if (voices.some((v) => !v)) setNote("部分旁白声音生成失败，只显示字幕");
      else setNote("");
      timelineRef.current = buildTimeline(
        animation,
        animation.scenes.map((s, i) => voices[i]?.duration ?? estimateSeconds(s.text))
      );
      musicBufRef.current = synthLoop(ac);
    }
    play(ac);
  }

  function play(ac: AudioContext) {
    teardown(false);
    const tl = timelineRef.current!;
    const startAt = ac.currentTime + 0.1;
    startAtRef.current = startAt;

    // 所有旁白按时间轴预先排好，暂停时整个 AudioContext 一起暂停，声画始终同步
    tl.segments.forEach((seg) => {
      if (seg.kind !== "narration") return;
      const buf = voicesRef.current[seg.index];
      if (!buf) return;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start(startAt + seg.start + seg.voiceAt);
      sourcesRef.current.push(src);
    });
    musicRef.current = startMusic(ac, musicBufRef.current!);
    setStatus("playing");

    const ctx = canvasRef.current!.getContext("2d")!;
    const loop = () => {
      const t = Math.max(0, ac.currentTime - startAt);
      renderFrame(ctx, tl, t);
      const s = segmentAt(tl, t);
      if (s.kind === "end") {
        musicRef.current?.setLevel(0);
        if (t - s.start > 3) {
          setStatus("ended"); // 停在结束画面，不自动播放下一个
          return;
        }
      } else {
        musicRef.current?.setLevel(isDancing(s) ? 0.55 : 0.07);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  async function togglePause() {
    const ac = audioCtxRef.current;
    if (!ac) return;
    if (status === "playing") {
      await ac.suspend();
      setStatus("paused");
    } else if (status === "paused") {
      await ac.resume();
      setStatus("playing");
    }
  }

  function close() {
    teardown(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onClose();
  }

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <canvas ref={canvasRef} width={W} height={H} style={canvasStyle} onClick={togglePause} />

      {(status === "ready" || status === "ended") && (
        <button onClick={start} style={bigBtn}>
          {status === "ready" ? "▶ 开始看故事" : "↻ 再看一遍"}
        </button>
      )}
      {status === "loading" && <div style={bigBtn}>准备中…</div>}
      {status === "paused" && (
        <button onClick={togglePause} style={bigBtn}>
          ▶ 继续
        </button>
      )}
      {note && <div style={noteStyle}>{note}</div>}
      <button onClick={close} style={closeBtn} aria-label="关闭">
        ✕
      </button>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "#000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const canvasStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  maxHeight: "100vh",
};

const bigBtn: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  padding: "18px 36px",
  fontSize: 28,
  borderRadius: 40,
  border: "none",
  background: "#ff7aa2",
  color: "#fff",
  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
};

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 44,
  height: 44,
  borderRadius: 22,
  border: "none",
  background: "rgba(255,255,255,0.8)",
  fontSize: 20,
};

const noteStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: "50%",
  transform: "translateX(-50%)",
  color: "#fff",
  background: "rgba(0,0,0,0.5)",
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 14,
};
