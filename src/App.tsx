import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Subject } from '../types';
import { Layout } from '../components/Layout';

const MENU_TYPES = {
  ANSWER: '🎯 Quét ngay',
  GUIDE: '📝 Thông suốt',
  QUIZ: '✏️ Chinh phục'
};

interface DiaryEntry {
  id: string;
  subject: string;
  type: 'IMAGE' | 'VOICE';
  content: string; 
  time: string;
}

// Cấu trúc dữ liệu từ Gemini
interface AnalysisResult {
  quetNgay: string;
  thongSuot: string;
  chinhPhuc: {
    cauHoi: string;
    options: string[];
    correct: number; // Index 0, 1, 2, 3
    explain: string;
  }[];
  audioSummary: string;
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<'HOME' | 'INPUT' | 'CROP' | 'ANALYSIS' | 'DIARY'>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeMenu, setActiveMenu] = useState(MENU_TYPES.ANSWER);
  const [image, setImage] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [crop, setCrop] = useState<Crop>();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  
  // Dữ liệu thực tế từ AI
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});

  useEffect(() => {
    const saved = localStorage.getItem('study_diary');
    if (saved) try { setDiaryEntries(JSON.parse(saved)); } catch (e) { console.error(e); }
  }, []);

  const saveToDiary = useCallback((type: 'IMAGE' | 'VOICE', content: string) => {
    const newEntry: DiaryEntry = {
      id: Date.now().toString(),
      subject: selectedSubject || 'Chưa rõ',
      type,
      content,
      time: new Date().toLocaleString('vi-VN'),
    };
    const updated = [newEntry, ...diaryEntries];
    setDiaryEntries(updated);
    localStorage.setItem('study_diary', JSON.stringify(updated));
  }, [selectedSubject, diaryEntries]);

  const speakVietnamese = (text: string) => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height));
  };

  // --- HÀM GỌI AI THẬT ---
  const handleRunAnalysis = async () => {
    if (!image && !voiceText) return alert("Vui lòng cung cấp đề bài!");
    setIsLoading(true);

    try {
      // Ở ĐÂY BẠN GỌI ĐẾN BACKEND ĐÃ VIẾT Ở BƯỚC TRƯỚC
      const response = await fetch('http://localhost:5000/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          image: image, // base64
          text: voiceText
        })
      });

      const result = await response.json();
      setAnalysisResult(result);
      saveToDiary(image ? 'IMAGE' : 'VOICE', image || voiceText);
      setScreen('ANALYSIS');
    } catch (error) {
      alert("Lỗi kết nối AI. Đang dùng dữ liệu giả lập để minh họa.");
      // Dữ liệu giả lập nếu lỗi API
      setAnalysisResult({
        quetNgay: "Đáp án: **x = 5**. \nCách bấm máy: [Mode] [5] [3]...",
        thongSuot: "### Lời giải chi tiết \nBước 1: Chuyển vế... \nBước 2: Chia hai vế cho 2...",
        chinhPhuc: [
          { cauHoi: "Câu 1 (Dễ): 2x = 10 thì x bằng mấy?", options: ["2", "5", "8", "10"], correct: 1, explain: "Ta có x = 10 / 2 = 5" },
          { cauHoi: "Câu 2 (Khó): Tìm x biết 2x + 4 = 14", options: ["3", "5", "7", "9"], correct: 1, explain: "2x = 10 => x = 5" }
        ],
        audioSummary: "Kết quả bài toán là x bằng 5. Bạn chỉ cần chia 10 cho 2 là ra kết quả ngay."
      });
      setScreen('ANALYSIS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout 
      onBack={() => {
        if (screen === 'ANALYSIS' || screen === 'CROP') setScreen('INPUT');
        else if (screen === 'INPUT' || screen === 'DIARY') setScreen('HOME');
      }}
      title={selectedSubject || (screen === 'DIARY' ? 'Nhật ký' : '')}
    >
      {/* --- MÀN HÌNH CHÍNH --- (Giữ nguyên) */}
      {screen === 'HOME' && (
         <div className="grid grid-cols-2 gap-5 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* ... code cũ của bạn ... */}
           {[Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY, Subject.DIARY].map((subName) => (
              <button key={subName} onClick={() => { subName === Subject.DIARY ? setScreen('DIARY') : (setSelectedSubject(subName), setScreen('INPUT'))}} className="p-10 bg-indigo-600 rounded-[2.5rem] text-white font-black">{subName}</button>
           ))}
         </div>
      )}

      {/* --- MÀN HÌNH NHẬP LIỆU --- (Giữ nguyên) */}
      {screen === 'INPUT' && (
        <div className="space-y-10">
          <div className="w-full aspect-[16/10] bg-white rounded-[3rem] flex items-center justify-center overflow-hidden border-2 border-slate-100 relative shadow-2xl">
            {image ? <img src={image} className="p-6 h-full object-contain" /> : <div className="text-slate-300">{voiceText || "Đang đợi đề bài..."}</div>}
            {isLoading && (
              <div className="absolute inset-0 bg-indigo-600/90 flex flex-col items-center justify-center text-white z-50">
                <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                <p className="mt-4 uppercase tracking-widest text-xs">Gemini đang giải...</p>
              </div>
            )}
          </div>
          <div className="flex justify-around">
             <button onClick={() => setScreen('CROP')} className="w-16 h-16 bg-indigo-600 rounded-2xl text-2xl">📸</button>
             <button onClick={() => setIsRecording(!isRecording)} className={`w-16 h-16 rounded-2xl text-2xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600'}`}>🎙️</button>
             <button onClick={handleRunAnalysis} className="w-16 h-16 bg-emerald-500 rounded-2xl text-2xl">🚀</button>
          </div>
        </div>
      )}

      {/* --- MÀN HÌNH CẮT ẢNH --- (Giữ nguyên) */}
      {screen === 'CROP' && image && (
         <div className="flex flex-col items-center">
            <ReactCrop crop={crop} onChange={c => setCrop(c)}><img src={image} onLoad={onImageLoad}/></ReactCrop>
            <button onClick={() => setScreen('INPUT')} className="mt-5 p-4 bg-indigo-600 text-white rounded-xl">XÁC NHẬN</button>
         </div>
      )}

      {/* --- MÀN HÌNH KẾT QUẢ --- (CẬP NHẬT MỚI) */}
      {screen === 'ANALYSIS' && analysisResult && (
        <div className="space-y-6 animate-in slide-in-from-right">
          {/* Menu 3 Tab */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {Object.values(MENU_TYPES).map(m => (
              <button key={m} onClick={() => setActiveMenu(m)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeMenu === m ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                {m}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 border shadow-xl min-h-[400px] relative">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => speakVietnamese(analysisResult.audioSummary)} className={`p-3 rounded-full ${isSpeaking ? 'bg-red-500 text-white' : 'bg-slate-50 text-indigo-600'}`}>
                {isSpeaking ? '⏹️' : '🔊 Nghe tóm tắt'}
              </button>
            </div>

            <div className="prose prose-indigo max-w-none">
              {/* TAB 1: QUÉT NGAY */}
              {activeMenu === MENU_TYPES.ANSWER && (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {analysisResult.quetNgay}
                </ReactMarkdown>
              )}

              {/* TAB 2: THÔNG SUỐT */}
              {activeMenu === MENU_TYPES.GUIDE && (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {analysisResult.thongSuot}
                </ReactMarkdown>
              )}

              {/* TAB 3: CHINH PHỤC (Trắc nghiệm tương tác) */}
              {activeMenu === MENU_TYPES.QUIZ && (
                <div className="space-y-10">
                  {analysisResult.chinhPhuc.map((q, qIdx) => (
                    <div key={qIdx} className="border-b pb-6">
                      <p className="font-bold mb-4">{q.cauHoi}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = quizAnswers[qIdx] === oIdx;
                          const isCorrect = oIdx === q.correct;
                          let btnStyle = "bg-slate-50 border-slate-200";
                          if (quizAnswers[qIdx] !== undefined) {
                             if (isCorrect) btnStyle = "bg-emerald-500 text-white border-emerald-500";
                             else if (isSelected) btnStyle = "bg-red-500 text-white border-red-500";
                          }
                          return (
                            <button 
                              key={oIdx} 
                              disabled={quizAnswers[qIdx] !== undefined}
                              onClick={() => setQuizAnswers({...quizAnswers, [qIdx]: oIdx})}
                              className={`p-3 rounded-xl border-2 transition-all font-bold ${btnStyle}`}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </button>
                          )
                        })}
                      </div>
                      {quizAnswers[qIdx] !== undefined && (
                        <div className="mt-4 p-4 bg-indigo-50 rounded-xl text-indigo-700 text-xs animate-in slide-in-from-top-2">
                          <strong>Giải thích:</strong> {q.explain}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MÀN HÌNH NHẬT KÝ --- (Giữ nguyên) */}
      {screen === 'DIARY' && (
        <div className="p-4">
           {/* Code hiển thị nhật ký cũ của bạn */}
        </div>
      )}
    </Layout>
  );
};

export default App;
