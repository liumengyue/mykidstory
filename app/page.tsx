"use client";

import { useState, useRef } from "react";

export default function Home() {
  // 🧠 默认值（提升首次体验）
  const [character, setCharacter] = useState("小猫咪");
  const [scene, setScene] = useState("城市");
  const [theme, setTheme] = useState("冒险");
  const [childInput, setChildInput] = useState("我想听一个故事");

  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 📖 生成故事
  const generateStory = async () => {
    setLoading(true);
    setStory("");

    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        body: JSON.stringify({
          character,
          scene,
          theme,
          child_input: childInput,
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

  // 🎧 播放语音
  const playAudio = async () => {
    if (!story) return alert("请先生成故事");

    setPlaying(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        body: JSON.stringify({ text: story }),
      });

      const data = await res.json();
      const base64 = data.audioBase64 || data.data;

      if (!base64) {
        alert("语音生成失败");
        setPlaying(false);
        return;
      }

      // 停止旧音频
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(`data:audio/mp3;base64,${base64}`);
      audioRef.current = audio;

      audio.play();

      audio.onended = () => {
        setPlaying(false);
        audioRef.current = null;
      };
    } catch (e) {
      console.error(e);
      setPlaying(false);
    }
  };

  // 🛑 停止播放
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlaying(false);
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        {/* 🧸 标题 */}
        <h1 style={{ textAlign: "center", marginBottom: 6 }}>
          🧸 MyKidStory
        </h1>

        <p style={sloganStyle}>
          每一个故事，都来自宝宝自己的想象。
        </p>

        {/* ✍️ 输入区 */}
        <div style={{ marginTop: 16 }}>
          {/* 角色 */}
          <label style={labelStyle}>🧸 故事角色</label>
          <input
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            placeholder="比如：小猫咪、小恐龙"
            style={inputStyle}
          />

          {/* 场景 */}
          <label style={labelStyle}>🌍 故事发生的地方</label>
          <input
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            placeholder="比如：森林、城市、太空"
            style={inputStyle}
          />

          {/* 主题 */}
          <label style={labelStyle}>💡 故事主题</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="比如：勇敢、友情、冒险"
            style={inputStyle}
          />

          {/* 想法 */}
          <label style={labelStyle}>👶 宝宝的想法（最重要）</label>
          <input
            value={childInput}
            onChange={(e) => setChildInput(e.target.value)}
            placeholder="比如：我想听一个会飞的故事"
            style={inputStyle}
          />
        </div>

        {/* 🔘 按钮区 */}
        <div style={btnRow}>
          <button onClick={generateStory} disabled={loading} style={btnPrimary}>
            {loading ? "生成中..." : "✨ 生成故事"}
          </button>

          <button onClick={playAudio} disabled={!story || playing} style={btnPlay}>
            🎧 播放
          </button>

          <button onClick={stopAudio} disabled={!playing} style={btnStop}>
            🛑 停止
          </button>
        </div>

        {/* 📖 故事 */}
        {story && (
          <div style={storyBox}>
            📖 {story}
          </div>
        )}
      </div>
    </main>
  );
}

/* ===================== */
/* 🎨 样式 */
/* ===================== */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#fdf6f0, #f3f7ff)",
  display: "flex",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "#fff",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
};

const sloganStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#888",
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#666",
  marginBottom: 6,
  marginTop: 10,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #eee",
  background: "#fafafa",
  fontSize: 14,
  marginBottom: 6,
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 12,
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: "12px 14px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #ff7aa2, #ffb199)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 15,
  boxShadow: "0 6px 14px rgba(255, 122, 162, 0.35)",
  cursor: "pointer",
};

const btnPlay: React.CSSProperties = {
  flex: 1,
  padding: "12px 14px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #6ec1e4, #7ad0ff)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 15,
  boxShadow: "0 6px 14px rgba(110, 193, 228, 0.35)",
  cursor: "pointer",
};

const btnStop: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #ff5c5c, #ff7b7b)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 15,
  boxShadow: "0 6px 14px rgba(255, 92, 92, 0.35)",
  cursor: "pointer",
};

const storyBox: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 16,
  background: "#fffaf3",
  border: "1px solid #f0e6d2",
  lineHeight: 1.8,
  fontSize: 15,
  whiteSpace: "pre-wrap",
};