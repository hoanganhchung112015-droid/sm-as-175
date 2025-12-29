import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Tăng limit để nhận ảnh base64

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.post('/api/solve', async (req: Request, res: Response) => {
  try {
    const { image, text, subject } = req.body;

    // 1. Cấu hình Model (Sử dụng 1.5 Flash để tốc độ nhanh nhất)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } // Ép trả về JSON
    });

    // 2. Xây dựng Prompt "Siêu năng lực"
    const prompt = `
      Bạn là một trợ lý giáo dục AI chuyên nghiệp cho học sinh Việt Nam, chuyên ngành ${subject}.
      Nhiệm vụ: Giải quyết đề bài từ hình ảnh hoặc văn bản được cung cấp.
      
      Yêu cầu đầu ra phải là một đối tượng JSON duy nhất với cấu trúc sau:
      {
        "quetNgay": "Đáp án cuối cùng cực ngắn gọn, nếu là toán hãy hướng dẫn cách bấm máy tính Casio cụ thể.",
        "thongSuot": "Lời giải chi tiết từng bước bằng ngôn ngữ dễ hiểu, trình bày bằng Markdown (sử dụng $ cho công thức toán).",
        "chinhPhuc": [
          {
            "cauHoi": "Một câu hỏi trắc nghiệm tương tự nhưng ở mức Thông hiểu",
            "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
            "correct": 0,
            "explain": "Giải thích tại sao chọn đáp án này"
          },
          {
            "cauHoi": "Một câu hỏi trắc nghiệm tương tự nhưng ở mức Vận dụng (khó hơn)",
            "options": ["A", "B", "C", "D"],
            "correct": 2,
            "explain": "Giải thích logic giải quyết"
          }
        ],
        "audioSummary": "Một đoạn tóm tắt ngắn khoảng 2 câu để đọc lên loa, tập trung vào kiến thức cốt lõi."
      }
    `;

    // 3. Xử lý dữ liệu đầu vào (Ảnh hoặc Text)
    const contentParts: any[] = [prompt];
    
    if (image) {
      // Tách bỏ phần header "data:image/jpeg;base64," nếu có
      const base64Data = image.split(',')[1] || image;
      contentParts.push({
        inlineData: { data: base64Data, mimeType: "image/jpeg" }
      });
    }

    if (text) {
      contentParts.push(text);
    }

    // 4. Gọi Gemini API
    const result = await model.generateContent(contentParts);
    const responseText = result.response.text();
    
    // Trả kết quả về cho Frontend
    res.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("Lỗi Backend:", error);
    res.status(500).json({ error: "Không thể xử lý đề bài này. Vui lòng thử lại." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});
