"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [character, setCharacter] = useState("小猫咪");
  const [scene, setScene] = useState("城市");
  const [theme, setTheme] = useState("冒险");
  const [childInput, setChildInput] = useState("我想听一个故事");

  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [length, setLength] = useState("短");

  /* ===================== */
  /* 📖 生成故事 + 自动播放 */
  /* ===================== */
  const generateStory = async () => {
    setLoading(true);
    setStory("");
    setAudioUrl(null);

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
      const newStory = data.story || "";
      setStory(newStory);

      // ⭐ 自动播放
      await handlePlay(newStory);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== */
  /* 🎧 获取音频 */
  /* ===================== */
  const fetchAudio = async (text: string) => {
    const res = await fetch("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    const base64 = data.audioBase64 || data.data;

    const byteCharacters = atob(base64);
    const byteArray = new Uint8Array(
      [...byteCharacters].map((c) => c.charCodeAt(0))
    );

    const blob = new Blob([byteArray], { type: "audio/mpeg" });
    return URL.createObjectURL(blob);
  };

  /* ===================== */
  /* ▶️ 播放 */
  /* ===================== */
  const handlePlay = async (text?: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setPlaying(true);

      let url = audioUrl;

      if (!url) {
        url = await fetchAudio(text || story);
        setAudioUrl(url);
      }

      audio.src = url;

      await audio.play();
    } catch (e) {
      console.error(e);
      setPlaying(false);
    }
  };

  /* ===================== */
  /* ⏸️ 暂停 / 继续 */
  /* ===================== */
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
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
  /* ⏱️ 拖动进度 */
  /* ===================== */
  const handleSeek = (e: any) => {
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
        <p style={sloganStyle}>
          每一个故事，都来自宝宝自己的想象。
        </p>

        {/* 输入 */}
        <div>
          <label style={labelStyle}>🧸 角色</label>
          <input value={character} onChange={(e) => setCharacter(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>🌍 场景</label>
          <input value={scene} onChange={(e) => setScene(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>💡 主题</label>
          <input value={theme} onChange={(e) => setTheme(e.target.value)} style={inputStyle} />
		  
		  <label style={labelStyle}>👶 宝宝想法</label>
          <input value={childInput} onChange={(e) => setChildInput(e.target.value)} style={inputStyle} />
		  
		  <label style={labelStyle}>📏 故事长度</label>
          <select value={length} onChange={(e) => setLength(e.target.value)} style={inputStyle}>
            <option value="短">🐣 短（约100字）</option>
            <option value="中">🌟 中（约200字）</option>
            <option value="长">🌙 长（约400字）</option>
          </select>

         
        </div>

        {/* 按钮 */}
        <div style={btnRow}>
          <button onClick={generateStory} style={btnPrimary}>
            {loading ? "生成中..." : "✨ 生成并播放"}
          </button>

          <button onClick={togglePlay} disabled={!audioUrl} style={btnPlay}>
            {playing ? "⏸️ 暂停" : "▶️ 继续"}
          </button>

          <button onClick={stopAudio} style={btnStop}>
            🛑 停止
          </button>
        </div>

        {/* 🎧 进度条 */}
        {audioUrl && (
          <div style={{ marginTop: 12 }}>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              style={{ width: "100%" }}
            />

            <div style={{ fontSize: 12, color: "#888" }}>
              {Math.floor(currentTime)}s / {Math.floor(duration)}s
            </div>
          </div>
        )}

        {/* 📖 故事 */}
        {story && <div style={storyBox}>📖 {story}</div>}

        {/* 🎧 核心 audio */}
        <audio
          ref={audioRef}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) =>
            setCurrentTime(e.currentTarget.currentTime)
          }
          onLoadedMetadata={(e) =>
            setDuration(e.currentTarget.duration)
          }
        />
      </div>
    </main>
  );
}

/* 样式保持不变 */
const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(#fdf6f0, #f3f7ff)",
  display: "flex",
  justifyContent: "center",
  padding: 20,
};

const cardStyle = {
  maxWidth: 520,
  width: "100%",
  background: "#fff",
  borderRadius: 22,
  padding: 20,
};

const sloganStyle = { textAlign: "center", color: "#888" };
const labelStyle = { marginTop: 10, display: "block" };

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #eee",
};

const btnRow = { display: "flex", gap: 10, marginTop: 12 };

const btnPrimary = {
  flex: 1,
  background: "#ff7aa2",
  color: "#fff",
  padding: 10,
  borderRadius: 12,
};

const btnPlay = {
  flex: 1,
  background: "#6ec1e4",
  color: "#fff",
  padding: 10,
  borderRadius: 12,
};

const btnStop = {
  background: "#ff5c5c",
  color: "#fff",
  padding: 10,
  borderRadius: 12,
};

const storyBox = {
  marginTop: 20,
  padding: 12,
  background: "#fffaf3",
  borderRadius: 12,
};