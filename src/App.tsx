import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Import các định nghĩa cần thiết
import { Subject } from '../types';
import { Layout } from '../components/Layout';

// Định nghĩa Menu và Enum ngay tại đây để không cần file ngoài
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

const App: React.FC = () => {
  // --- QUẢN LÝ TRẠNG THÁI ---
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

  // Tải nhật ký từ LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('study_diary');
    if (saved) {
      try {
        setDiaryEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi dữ liệu nhật ký");
      }
    }
  }, []);

  // Hàm lưu Nhật ký
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

  // Hàm đọc giọng nói
  const speakVietnamese = (text: string) => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[$#*]/g, ''));
    utterance.lang = 'vi-VN';
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height));
  };

  // --- HÀM XỬ LÝ CHÍNH (Đã bỏ gemini.ts) ---
  const handleRunAnalysis = () => {
    if (!image && !voiceText) return alert("Vui lòng cung cấp đề bài!");
    
    setIsLoading(true);
    saveToDiary(image ? 'IMAGE' : 'VOICE', image || voiceText);
    
    // Tạo hiệu ứng xử lý giả lập 1.5 giây
    setTimeout(() => {
      if (voiceText) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(voiceText)}`, '_blank');
      } else {
        // Mở tìm kiếm bằng hình ảnh của Google
        window.open('https://www.google.com/searchbyimage', '_blank');
      }
      setIsLoading(false);
      setScreen('ANALYSIS');
    }, 1500);
  };

  return (
    <Layout 
      onBack={() => {
        if (screen === 'ANALYSIS' || screen === 'CROP') setScreen('INPUT');
        else if (screen === 'INPUT' || screen === 'DIARY') setScreen('HOME');
      }}
      title={selectedSubject || (screen === 'DIARY' ? 'Nhật ký' : '')}
    >
      {/* --- MÀN HÌNH CHÍNH: CHỌN MÔN --- */}
      {screen === 'HOME' && (
        <div className="grid grid-cols-2 gap-5 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {[
            { name: Subject.MATH, color: 'bg-indigo-600', icon: '📐' },
            { name: Subject.PHYSICS, color: 'bg-violet-600', icon: '⚛️' },
            { name: Subject.CHEMISTRY, color: 'bg-emerald-600', icon: '🧪' },
            { name: Subject.DIARY, color: 'bg-amber-600', icon: '📔' },
          ].map((sub) => (
            <button 
              key={sub.name} 
              onClick={() => { if (sub.name === Subject.DIARY) setScreen('DIARY'); else { setSelectedSubject(sub.name as Subject); setScreen('INPUT'); } }} 
              className={`${sub.color} aspect-square rounded-[2.5rem] flex flex-col items-center justify-center text-white shadow-xl active:scale-95 transition-all`}
            >
              <span className="text-lg font-black mb-2 uppercase tracking-tight">{sub.name}</span>
              <span className="text-5xl">{sub.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* --- MÀN HÌNH NHẬP LIỆU: CAMERA / MIC --- */}
      {screen === 'INPUT' && (
        <div className="space-y-10 animate-in zoom-in-95 duration-500">
          <div className="w-full aspect-[16/10] bg-white rounded-[3rem] flex items-center justify-center overflow-hidden border-2 border-slate-100 relative shadow-2xl">
            {image ? (
              <img src={image} className="p-6 h-full object-contain" />
            ) : (
              <div className="p-10 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                {voiceText || "Đang đợi đề bài từ bạn..."}
              </div>
            )}
            
            {/* VÒNG XOAY LOADING CHUYÊN NGHIỆP */}
            {isLoading && (
              <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-50">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Hệ thống đang xử lý...</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-4">
            <button onClick={() => setScreen('CROP')} className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-75 transition-all text-2xl">📸</button>
            
            <input type="file" id="f" className="hidden" onChange={(e) => { 
              const f = e.target.files?.[0]; 
              if (f) { 
                const r = new FileReader(); 
                r.onload = (ev) => setImage(ev.target?.result as string); 
                r.readAsDataURL(f); 
              } 
            }} />
            <button onClick={() => document.getElementById('f')?.click()} className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-75 transition-all text-2xl">🖼️</button>
            
            <button onClick={() => setIsRecording(!isRecording)} className={`w-16 h-16 rounded-[1.5rem] ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600'} text-white shadow-lg flex items-center justify-center active:scale-75 transition-all text-2xl`}>🎙️</button>
            
            <button onClick={handleRunAnalysis} className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-75 transition-all text-2xl">🚀</button>
          </div>
        </div>
      )}

      {/* --- MÀN HÌNH CẮT ẢNH --- */}
      {screen === 'CROP' && image && (
        <div className="flex flex-col items-center animate-in fade-in">
          <div className="rounded-[2rem] overflow-hidden border-4 border-indigo-600 shadow-2xl">
            <ReactCrop crop={crop} onChange={c => setCrop(c)}>
              <img src={image} onLoad={onImageLoad} className="max-h-[55vh]" />
            </ReactCrop>
          </div>
          <button onClick={() => setScreen('INPUT')} className="mt-8 px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest active:scale-95 transition-all">XÁC NHẬN ẢNH ✅</button>
        </div>
      )}

      {/* --- MÀN HÌNH KẾT QUẢ --- */}
      {screen === 'ANALYSIS' && (
        <div className="space-y-6 animate-in slide-in-from-right">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-white">
            {Object.values(MENU_TYPES).map(m => (
              <button key={m} onClick={() => setActiveMenu(m)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeMenu === m ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-xl min-h-[400px] relative">
            <div className="flex justify-between mb-8">
              <button onClick={() => saveToDiary('VOICE', 'Ghi chú bài học')} className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">💾 LƯU KẾT QUẢ</button>
              <button onClick={() => speakVietnamese("Kết quả đã được mở trên trình duyệt của bạn")} className={`p-3 rounded-full ${isSpeaking ? 'bg-red-500 text-white' : 'bg-slate-50 text-indigo-600'}`}>🔊</button>
            </div>
            <div className="prose prose-slate text-sm text-center py-20 italic text-slate-400">
               Kết quả đang hiển thị tại tab mới...
            </div>
          </div>
        </div>
      )}

      {/* --- MÀN HÌNH NHẬT KÝ --- */}
      {screen === 'DIARY' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="font-black text-indigo-600 uppercase tracking-widest text-lg">Lịch sử</h2>
            {diaryEntries.length > 0 && (
              <button onClick={() => { if(window.confirm("Xóa hết?")) { setDiaryEntries([]); localStorage.removeItem('study_diary'); } }} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-2 rounded-xl">XÓA TẤT CẢ 🗑️</button>
            )}
          </div>

          <div className="space-y-4">
            {diaryEntries.map(entry => (
              <div key={entry.id} className="bg-white p-5 rounded-[2.2rem] shadow-sm border border-slate-50 flex items-center gap-4 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xs ${
                    entry.subject === Subject.MATH ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}>
                    {entry.subject.substring(0, 1)}
                </div>

                <div className="flex-1">
                  <p className="text-[9px] text-slate-300 font-bold uppercase">{entry.time}</p>
                  <p className="text-sm font-black text-slate-700">
                    {entry.type === 'IMAGE' ? '📷 Bài tập ảnh' : `🎙️ ${entry.content.substring(0, 25)}...`}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => {
                        const updated = diaryEntries.filter(e => e.id !== entry.id);
                        setDiaryEntries(updated);
                        localStorage.setItem('study_diary', JSON.stringify(updated));
                    }} className="text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">XÓA 🗑️</button>
                  </div>
                </div>

                {entry.type === 'IMAGE' && (
                  <img src={entry.content} className="w-16 h-16 rounded-2xl object-cover border shadow-sm" />
                )}
              </div>
            ))}
          </div>

          {diaryEntries.length === 0 && (
            <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-slate-200 text-slate-300 italic">Nhật ký trống...</div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default App;