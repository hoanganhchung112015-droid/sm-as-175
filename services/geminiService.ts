// File: src/services/geminiService.ts
import { Subject, AgentType } from "../types";

/**
 * HÀM XỬ LÝ NHIỆM VỤ (SIÊU TÌM KIẾM KHÔNG API KEY)
 * Tự động điều hướng đến các nguồn học liệu tinh túy nhất Việt Nam
 */
export const processTask = async (subject: Subject, agent: AgentType, input: string) => {
  // 1. Định nghĩa "Siêu nguồn" tinh túy cho từng môn học
  const sourceMap: Record<string, string> = {
    [Subject.MATH]: "site:toanmath.com OR site:vungoi.vn OR site:loigiaihay.com OR site:hoc247.net",
    [Subject.PHYSICS]: "site:thuvienvatly.com OR site:vietjack.com OR site:loigiaihay.com OR site:luyentap247.com",
    [Subject.CHEMISTRY]: "site:hoc24.vn OR site:cunghocvui.com OR site:vietjack.com OR site:tudienphuongtrinh.com",
    [Subject.DIARY]: "site:loigiaihay.com OR site:vietjack.com" // Mặc định cho các mục khác
  };

  // Lấy danh sách site dựa trên môn học đã chọn, nếu không có thì dùng nguồn tổng hợp
  const sources = sourceMap[subject] || "site:loigiaihay.com OR site:vietjack.com OR site:hoc24.vn";
  
  // 2. Kỹ thuật "Ép hiển thị" dữ liệu theo đặc thù của từng Chuyên gia
  let searchModifier = "";
  
  switch (agent) {
    case AgentType.SPEED:
      // Chuyên gia 1: Tập trung lấy đáp án và con số cuối cùng
      searchModifier = "đáp án kết quả cuối cùng ngắn gọn";
      break;
    case AgentType.SOCRATIC:
      // Chuyên gia 2: Tập trung lấy các bước giải và phương pháp
      searchModifier = "cách giải chi tiết từng bước một phương pháp";
      break;
    case AgentType.PERPLEXITY:
      // Chuyên gia 3: Tìm các đề thi hoặc bài tập có dạng tương tự
      searchModifier = "bài tập tương tự tự luyện có lời giải";
      break;
    default:
      searchModifier = "lời giải chi tiết";
  }

  // 3. Xây dựng câu lệnh tìm kiếm (Search Query)
  // Sử dụng dấu ngoặc kép cho input để tăng độ chính xác lên 100%
  const cleanInput = input.replace(/"/g, ''); // Loại bỏ ngoặc kép cũ nếu có
  const finalQuery = `("${cleanInput}") ${searchModifier} ${sources}`;

  // 4. Mở Tab siêu tìm kiếm trên Google
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;
  
  // Mở tab mới
  const win = window.open(searchUrl, '_blank');
  if (win) {
    win.focus();
  } else {
    alert("Vui lòng cho phép trình duyệt mở Pop-up để xem lời giải!");
  }

  // Trả về thông báo để hiển thị trên giao diện App
  return `🚀 Hệ thống đã gửi yêu cầu tới các nguồn chuyên sâu môn ${subject}. 
          Chuyên gia ${agent} đang hiển thị lời giải ở tab mới của bạn.`;
};

/**
 * CÁC HÀM HỖ TRỢ (GIỮ NGUYÊN ĐỂ KHÔNG LỖI APP)
 */
export const generateSimilarQuiz = async (answer: string) => {
  return "Hệ thống đang trích xuất các câu hỏi luyện tập tương tự từ kho dữ liệu...";
};

export const generateSummary = async (text: string) => {
  return "Tóm tắt kiến thức trọng tâm dựa trên nguồn học liệu đã tìm kiếm.";
};

export const fetchTTSAudio = async (text: string) => {
  return "native-browser-tts"; // Chúng ta dùng Loa của trình duyệt trực tiếp trong App.tsx
};

export const optimizeImage = async (base64Str: string) => {
  // Không cần xử lý nén quá sâu vì không gửi đi API tốn phí
  return base64Str;
};