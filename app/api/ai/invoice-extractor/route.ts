import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { processAiToken } from "@/lib/tollbooth"; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. LOGIN CHECK
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Bhai, pehle login kar le!" }, { status: 401 });
    }

    // 2. CALL THE BOUNCER (Toll Booth)
    const tollBooth = await processAiToken(session.user.email);
    if (!tollBooth.allowed) {
      return NextResponse.json({ 
        error: tollBooth.error, 
        needsPayment: tollBooth.needsPayment 
      }, { status: 403 });
    }

    // 3. RUN AI LOGIC
    const body = await req.json();
    const { invoiceText } = body;

    if (!invoiceText) {
        return NextResponse.json({ error: "No text found in PDF." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
        You are an expert accountant and data extraction AI.
        Read the following text extracted from an invoice PDF and extract the key details.
        
        Return the result STRICTLY as a valid JSON object with EXACTLY these keys:
        - vendorName (string)
        - invoiceNumber (string)
        - date (string)
        - totalAmount (string, include currency symbol if present)
        - items (array of objects, each with: description (string), quantity (string), price (string), total (string))

        If you cannot find a specific piece of information, use "N/A" for that field.
        DO NOT include any markdown formatting like \`\`\`json, just return the raw JSON braces.

        Invoice Text:
        """
        ${invoiceText.substring(0, 15000)}
        """
      `;
    
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Safety cleanup in case Gemini adds markdown code blocks
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json({ success: true, data: responseText });

  } catch (error) {
    console.error("Invoice Extractor API Error:", error);
    return NextResponse.json({ error: "AI Server Error or Invalid Parsing." }, { status: 500 });
  }
}