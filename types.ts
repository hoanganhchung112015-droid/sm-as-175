export enum Subject {
  MATH = "Toán Học",
  PHYSICS = "Vật Lý",
  CHEMISTRY = "Hóa Học",
  DIARY = "Nhật Ký"
}

export enum AgentType {
  SPEED = "Quét Ngay",
  SOCRATIC = "Thông Suốt",
  PERPLEXITY = "Chinh Phục"
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface AnalysisResult {
  content: string;
  mindMap: string;
  quiz?: QuizQuestion[];
}

export type InputMode = 'CAMERA' | 'GALLERY' | 'VOICE';
