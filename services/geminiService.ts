import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Subject, AgentType } from "../types";

// CẤU HÌNH MODEL - Gemini 2.5 Flash cân toàn bộ để đạt tốc độ cao nhất
const MODEL_CONFIG = {
  TEXT: 'gemini-2.5-flash',
  TTS: 'gemini-2.5-flash-tts', // Sử dụng model chuyên dụng cho Audio
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CACHING LAYER
const cache = new Map<string, string>();
const audioCache = new Map<string, string>();

const SYSTEM_PROMPTS: Record<string, string> = {
  // Tab 1: Kết quả & Casio
  [AgentType.SPEED]: `Bạn là chuyên gia giải toán siêu tốc. 
    NHIỆM VỤ: Trả về JSON {"finalAnswer": "...", "casioSteps": "..."}.
    - finalAnswer: Chỉ ghi đáp án cuối cùng (Dùng LaTeX). 
    - casioSteps: Các bước bấm máy Casio 580VN X ngắn gọn nhất. Nếu không cần máy tính, ghi "Bài toán không cần bấm máy".`,

  // Tab 2: Lời giải chi tiết
  [AgentType.SOCRATIC]: `Bạn là giáo sư giảng bài.
    NHIỆM VỤ: Giải chi tiết bài toán theo từng bước logic chặt chẽ. 
    YÊU CẦU: Ngôn ngữ khoa học, dùng LaTeX cho mọi công thức. Không chào hỏi.`,

  // Tab 3: Trắc nghiệm (Dễ & Khó)
  [AgentType.PERPLEXITY]: `Bạn là chuyên gia ra đề thi. 
    NHIỆM VỤ: Tạo 2 câu hỏi trắc nghiệm tương tự thi THPTQG.
    - Câu 1: Mức độ Thông hiểu (Dễ).
    - Câu 2: Mức độ Vận dụng (Khó).
    Trả về định dạng JSON: {"quizzes": [{"question": "...", "options": ["A.", "B.", "C.", "D."], "answer": "A", "explanation": "..."}]}`
};

async function safeExecute<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    throw new Error(error.toString().includes('429') ? "Hệ thống bận, hãy thử lại." : error.message);
  }
}

// 1. Hàm xử lý chung cho các Tab (Chạy song song ở App.tsx)
export const processTask = async (subject: Subject, agent: AgentType, input: string, image?: string) => {
  const cacheKey = `${subject}|${agent}|${input.substring(0, 50)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  return safeExecute(async () => {
    const prompt = `Môn: ${subject}. Nhiệm vụ: ${SYSTEM_PROMPTS[agent]}. Đề bài: ${input}`;
    const parts: any[] = [{ text: prompt }];
    if (image) parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } });

    const response = await ai.models.generateContent({
      model: MODEL_CONFIG.TEXT,
      contents: { parts },
      config: {
        temperature: 0.1,
        responseMimeType: agent !== AgentType.SOCRATIC ? "application/json" : "text/plain"
      }
    });

    const resText = response.text || "";
    cache.set(cacheKey, resText);
    return resText;
  });
};

// 2. Hàm tạo câu hỏi trắc nghiệm nâng cao (Tab 3)
export const generateSimilarQuiz = async (content: string) => {
  // Vì Tab 3 đã tích hợp trong processTask (AgentType.PERPLEXITY), 
  // hàm này có thể dùng để bổ trợ hoặc parse lại dữ liệu nếu cần.
  return null; 
};

// 3. Hàm tóm tắt để đọc (Audio Summary)
export const generateSummary = async (content: string) => {
  if (!content) return "";
  return safeExecute(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_CONFIG.TEXT,
      contents: `Tóm tắt kết quả sau thành 1 câu nói cực ngắn để đọc (không đọc công thức phức tạp): ${content}`,
    });
    return response.text || "";
  });
};

// 4. Hàm lấy Audio từ Gemini TTS (Chị Google chuẩn)
export const fetchTTSAudio = async (text: string) => {
  if (!text) return undefined;
  const cacheKey = `TTS|${text}`;
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey);

  return safeExecute(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_CONFIG.TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Puck' } // Giọng nữ Việt chuẩn (nếu model hỗ trợ) hoặc mặc định chất lượng cao
          } 
        },
      },
    });
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (data) audioCache.set(cacheKey, data);
    return data;
  });
};

// 5. Trình phát Audio
let globalAudioContext: AudioContext | null = null;
let globalSource: AudioBufferSourceNode | null = null;

export const playStoredAudio = async (base64Audio: string, audioSourceRef: React.MutableRefObject<AudioBufferSourceNode | null>) => {
  if (!base64Audio) return;

  if (globalSource) {
    try { globalSource.stop(); } catch(e) {}
    globalSource.disconnect();
  }

  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  
  if (globalAudioContext.state === 'suspended') await globalAudioContext.resume();

  const audioData = atob(base64Audio);
  const bytes = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) bytes[i] = audioData.charCodeAt(i);
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = globalAudioContext.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

  const source = globalAudioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(globalAudioContext.destination);
  
  globalSource = source;
  audioSourceRef.current = source;

  return new Promise((resolve) => { 
    source.onended = () => resolve(void 0); 
    source.start(); 
  });
};
