import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { processAiToken } from "@/lib/tollbooth"; // 🚀 BOUNCER BULA LIYA

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. LOGIN CHECK
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please login to use the chat." }, { status: 401 });
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
    const { pdfText, userMessage } = body;

    if (!pdfText || !userMessage) {
        return NextResponse.json({ error: "Missing document text or question." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
        You are a helpful and intelligent assistant. 
        Answer the user's question based strictly on the provided document text below.
        If the answer is not in the text, say "I couldn't find that information in the document."
        
        Document Text:
        """
        ${pdfText.substring(0, 30000)}
        """

        User Question: ${userMessage}
      `;

    const result = await model.generateContent(prompt);
    
    return NextResponse.json({ success: true, data: result.response.text() });

  } catch (error) {
    console.error("Chat PDF API Error:", error);
    return NextResponse.json({ error: "Failed to connect to the AI engine." }, { status: 500 });
  }
}