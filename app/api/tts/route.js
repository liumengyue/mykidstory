export const runtime = 'edge';
export async function POST(req) {
  try {
    const { text } = await req.json();

    const response = await fetch(
      "https://openspeech.bytedance.com/api/v1/tts", // ✅ 同步TTS接口
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer;${process.env.VOLC_ACCESS_KEY}`,
        },
        body: JSON.stringify({
          app: {
            appid: process.env.VOLC_APP_ID,
            token: "default-token",
            cluster: "volcano_tts",
          },

          // 🎧 核心语音参数
          audio: {
            voice_type: "zh_female_vv_uranus_bigtts", // 豆包语音
            encoding: "mp3",
            speed_ratio: 0.85,  // 👶 儿童慢一点
            pitch_ratio: 1.15,  // 🧸 更温柔
            volume_ratio: 1.0,
          },
		   user: {
        uid: "豆包语音"
    },

          request: {
            reqid: Date.now().toString(),
            text: text,
            text_type: "plain",
			operation: "query",
			"reqid": "021776766294850fdbddc01000a066118586304730000f1e322ff",
          },
        }),
      }
    );

   const result = await response.json();

console.log("🎧 火山同步TTS返回：", result);

if (result.code !== 3000) {
  return Response.json({
    error: "TTS_FAILED",
    raw: result
  }, { status: 500 });
}

// ✅ 关键：把 data 映射成 audioBase64
return Response.json({
  audioBase64: result.data
});

  } catch (err) {
    console.error("TTS_ERROR:", err);

    return Response.json(
      {
        error: err.message,
      },
      { status: 500 }
    );
  }
}
