import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { processAiToken } from "@/lib/tollbooth"; // 🚀 BOUNCER IMPORT KIYA

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. LOGIN CHECK
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Bhai, pehle login kar le!" }, { status: 401 });
    }

    // 2. THE TOLLBOOTH CHECK
    const tollBooth = await processAiToken(session.user.email);
    if (!tollBooth.allowed) {
      return NextResponse.json({ 
        error: tollBooth.error, 
        needsPayment: tollBooth.needsPayment 
      }, { status: 403 });
    }

    // 3. RUN AI LOGIC
    const body = await req.json();
    const { base64Images } = body;

    if (!base64Images || base64Images.length === 0) {
        return NextResponse.json({ error: "Koi image nahi mili process karne ke liye." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = "You are an expert OCR system. Extract ALL the text from these images exactly as it appears. Preserve paragraphs, lists, and formatting. Do not add any extra explanations, just return the extracted text.";
    
    const imageParts = base64Images.map((base64Data: string) => ({
        inlineData: {
            data: base64Data.split(',')[1],
            mimeType: "image/jpeg"
        }
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    return NextResponse.json({ success: true, data: responseText });

  } catch (error) {
    console.error("Smart OCR API Error:", error);
    return NextResponse.json({ error: "AI Server Error ya image size bohot bada hai." }, { status: 500 });
  }
}