import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Supabase Connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Gemini Connection
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. CHECK LOGIN (Toll Booth Check 1)
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Bhai, pehle login kar le!" }, { status: 401 });
    }

    // 2. CHECK QUOTA IN SUPABASE (Toll Booth Check 2)
    const { data: userDB } = await supabase
      .from('users')
      .select('ai_count, is_pro')
      .eq('email', session.user.email)
      .single();

    // Agar 5 se zyada use kar liya aur pro nahi hai, toh bhaga do
    if (userDB && userDB.ai_count >= 5 && !userDB.is_pro) {
      return NextResponse.json({ error: "Teri daily free limit (5/5) khatam ho gayi hai. Kal aana!" }, { status: 403 });
    }

    // --- AGAR YAHAN TAK AAYA, MATLAB SAB THEEK HAI ---

    // 3. FRONTEND SE DATA LO (Resume ki details)
    const body = await req.json();
    const { resumeText, jobDescription } = body;

    if (!resumeText) {
      return NextResponse.json({ error: "Resume kahan hai bhai?" }, { status: 400 });
    }

    // 4. GEMINI AI KO PROMPT BHEJO
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Act as an expert ATS (Applicant Tracking System). Analyze this resume against the job description. Give an ATS score out of 100, and list 3 missing keywords.\n\nResume: ${resumeText}\n\nJob Description: ${jobDescription || 'Any generic IT role'}`;
    
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    // 5. UPDATE SUPABASE (Count + 1 kar do)
    await supabase
      .from('users')
      .update({ ai_count: (userDB?.ai_count || 0) + 1 })
      .eq('email', session.user.email);

    // 6. RESULT WAPAS FRONTEND KO BHEJO
    return NextResponse.json({ success: true, data: aiResponse });

  } catch (error) { 
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Server mein kuch gadbad hai." }, { status: 500 });
  }
}