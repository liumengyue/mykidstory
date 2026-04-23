"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [character, setCharacter] = useState("小猫咪");
  const [scene, setScene] = useState("城市");
  const [theme, setTheme] = useState("冒险");
  const [childInput, setChildInput] = useState("我想听一个故事");
  const [length, setLength] = useState("中");

  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* ===================== */
  /* 📖 生成故事 */
  /* ===================== */
  const generateStory = async () => {
    setLoading(true);
    setStory("");
    stopAudio();

    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        body: JSON.stringify({
          character,
          scene,
          theme,
          child_input: childInput,
          length,
        }),
      });

      const data = await res.json();
      setStory(data.story || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== */
  /* 🎧 获取音频（关键稳定写法） */
  /* ===================== */
  const fetchAudio = async (text: string) => {
    const res = await fetch("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    const base64 = data.audioBase64 || data.data;

    if (!base64) throw new Error("no audio");

    // ✅ base64 → Blob（最稳定方案）
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length)
      .fill(0)
      .map((_, i) => byteCharacters.charCodeAt(i));

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "audio/mpeg" });

    return URL.createObjectURL(blob);
  };

  /* ===================== */
  /* ▶️ 播放（移动端稳定核心） */
  /* ===================== */
  const handlePlay = async () => {
    if (!story) {
      alert("请先生成故事");
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    try {
      setPlaying(true);

      let url = audioUrl;

      if (!url) {
        url = await fetchAudio(story);
        setAudioUrl(url);
      }

      audio.src = url;
      audio.load(); // ⭐关键：强制加载

      // ⭐ 等待可播放（解决0秒问题）
      await new Promise<void>((resolve) => {
        audio.oncanplaythrough = () => resolve();
      });

      await audio.play();
    } catch (e) {
      console.error("播放失败", e);
      setPlaying(false);
    }
  };

  /* ===================== */
  /* ⏸️ 暂停/继续 */
  /* ===================== */
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  /* ===================== */
  /* 🛑 停止 */
  /* ===================== */
  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
  };

  /* ===================== */
  /* ⏱️ 拖动进度（去掉 any） */
  /* ===================== */
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ textAlign: "center" }}>🧸 MyKidStory</h1>

        <p style={sloganStyle as React.CSSProperties}>
          每一个故事，都来自宝宝自己的想象。
        </p>

        {/* 输入区 */}
        <label>角色</label>
        <input value={character} onChange={(e) => setCharacter(e.target.value)} style={inputStyle} />

        <label>场景</label>
        <input value={scene} onChange={(e) => setScene(e.target.value)} style={inputStyle} />

        <label>主题</label>
        <input value={theme} onChange={(e) => setTheme(e.target.value)} style={inputStyle} />

        <label>故事长度</label>
        <select value={length} onChange={(e) => setLength(e.target.value)} style={inputStyle}>
          <option value="短">短</option>
          <option value="中">中</option>
          <option value="长">长</option>
        </select>

        <label>宝宝想法</label>
        <input value={childInput} onChange={(e) => setChildInput(e.target.value)} style={inputStyle} />

        {/* 按钮 */}
        <div style={btnRow}>
          <button onClick={generateStory} style={btnPrimary}>
            {loading ? "生成中..." : "生成故事"}
          </button>

          <button onClick={handlePlay} style={btnPlay}>
            {playing ? "播放中..." : "播放"}
          </button>

          <button onClick={stopAudio} style={btnStop}>
            停止
          </button>
        </div>

        {/* 进度条 */}
        {audioUrl && (
          <div style={{ marginTop: 10 }}>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12 }}>
              {Math.floor(currentTime)} / {Math.floor(duration)} s
            </div>
          </div>
        )}

        {/* 故事 */}
        {story && <div style={storyBox}>{story}</div>}

        {/* 🎧 核心播放器 */}
        <audio
          ref={audioRef}
          preload="auto"
          playsInline
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      </div>
    </main>
  );
}

/* 样式 */
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f5f7ff",
  display: "flex",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "#fff",
  borderRadius: 20,
  padding: 20,
};

const sloganStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#888",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  marginBottom: 8,
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 10,
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  background: "#ff7aa2",
  color: "#fff",
  padding: 10,
  borderRadius: 10,
};

const btnPlay: React.CSSProperties = {
  flex: 1,
  background: "#6ec1e4",
  color: "#fff",
  padding: 10,
  borderRadius: 10,
};

const btnStop: React.CSSProperties = {
  background: "#ff5c5c",
  color: "#fff",
  padding: 10,
  borderRadius: 10,
};

const storyBox: React.CSSProperties = {
  marginTop: 20,
  padding: 12,
  background: "#fffaf3",
  borderRadius: 10,
};