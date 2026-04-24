'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Wand2, FileText, CheckCircle, XCircle, Briefcase, Lock, AlertCircle, FileUp } from 'lucide-react';
import Link from 'next/link';
import { useSession, signIn } from "next-auth/react"; 

const STOP_WORDS = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 'with', 'are', 'have', 'be', 'at', 'or', 'as', 'was', 'so', 'if', 'out', 'not', 'we', 'my', 'can', 'will', 'do', 'your', 'from', 'an', 'by', 'about', 'they', 'which', 'what', 'all', 'their', 'there', 'would', 'up', 'who', 'more', 'when', 'some', 'make', 'like', 'time', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'experience', 'required', 'skills', 'job', 'role', 'team', 'working', 'years']);

export default function ATSGeniePage() {
  const { data: session } = useSession(); 
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [apiError, setApiError] = useState(''); 
  
  const [atsResult, setAtsResult] = useState<{
    score: number;
    matched: string[];
    missing: string[];
    aiAdvice?: string; 
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      setIsEngineReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        setIsEngineReady(true);
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].type !== 'application/pdf') {
         setApiError("Only PDFs are allowed!");
         return;
      }
      setFile(e.target.files[0]);
      setAtsResult(null);
      setApiError('');
    }
  };

  const extractKeywords = (text: string) => {
    const words = text.toLowerCase().replace(/[^a-z0-9+#-]/g, ' ').split(/\s+/);
    const uniqueKeywords = Array.from(new Set(
      words.filter(w => w.length > 2 && !STOP_WORDS.has(w) && isNaN(Number(w)))
    ));
    return uniqueKeywords;
  };

  const handleAnalyze = async () => {
    if (!file || !jobDescription.trim()) return;
    setIsProcessing(true);
    setApiError(''); 

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      
      let resumeText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        resumeText += textContent.items.map((item: any) => item.str).join(' ') + ' ';
      }

      if (resumeText.trim().length < 50) {
          setApiError("Something went wrong reading the PDF. Is it a scanned image?");
          setIsProcessing(false);
          return;
      }

      let aiAdviceText = '';
      try {
        const response = await fetch('/api/ai/ats-genie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, jobDescription }),
        });
        
        const apiData = await response.json();

        if (!response.ok) {
          setApiError(apiData.error || "Server issue. Please try again.");
          setIsProcessing(false);
          return; 
        }
        
        aiAdviceText = apiData.data;

      } catch (backendError) {
        setApiError("Network error. Please check your connection.");
        setIsProcessing(false);
        return;
      }

      const jdKeywords = extractKeywords(jobDescription);
      const resumeKeywords = extractKeywords(resumeText);
      
      const matched: string[] = [];
      const missing: string[] = [];

      jdKeywords.forEach(keyword => {
          const found = resumeKeywords.some(rk => rk === keyword || rk.includes(keyword) || keyword.includes(rk));
          if (found) {
              matched.push(keyword);
          } else {
              missing.push(keyword);
          }
      });

      let score = 0;
      if (jdKeywords.length > 0) {
          score = Math.round((matched.length / jdKeywords.length) * 100);
      }

      setAtsResult({ score, matched, missing, aiAdvice: aiAdviceText });
      setIsProcessing(false);

    } catch (error) {
      console.error("ATS Error:", error);
      setApiError("Something went wrong analyzing the file.");
      setIsProcessing(false);
    }
  };

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-emerald-500';
      if (score >= 50) return 'text-amber-500';
      return 'text-red-500';
  };

  const getScoreStroke = (score: number) => {
      if (score >= 80) return '#10b981';
      if (score >= 50) return '#f59e0b';
      return '#ef4444';
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 min-h-[calc(100vh-80px)] flex flex-col bg-slate-50">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wide">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Wand2 className="w-6 h-6 text-purple-600" /> ATS Genie
          </h1>
        </div>
      </div>

      {apiError && (
        <div className="mb-8 bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold animate-in zoom-in-95">
          <AlertCircle className="w-6 h-6" />
          <p>{apiError}</p>
        </div>
      )}

      {!atsResult && !isProcessing && (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column */}
          <div className="flex-1">
             <div className="mb-8 bg-purple-50 border border-purple-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-start transition-all hover:shadow-md">
                <div className="p-4 bg-purple-100 rounded-2xl mb-4">
                  <Briefcase className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-black text-purple-900 text-2xl mb-2">Beat the Robot Scanners</h3>
                <p className="text-purple-800 text-sm font-medium leading-relaxed mb-4">
                  90% of large companies use an Applicant Tracking System (ATS) to automatically reject resumes before a human ever sees them. 
                  Compare your Resume against the Job Description to instantly find missing keywords.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-purple-700 text-xs font-bold rounded-lg border border-purple-200">
                  🔒 AI Powered Analysis & Feedback
                </div>
             </div>

             <div 
               onClick={() => isEngineReady && fileInputRef.current?.click()} 
               className={`w-full bg-white border-2 border-dashed ${file ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'} rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group ${!isEngineReady && 'opacity-50'}`}
             >
                {file ? (
                  <>
                    <div className="p-4 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-200">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-black text-purple-900 text-lg mb-1 truncate w-full px-4" title={file.name}>{file.name}</h3>
                    <span className="text-xs font-bold bg-white text-purple-800 px-3 py-1 rounded-full uppercase tracking-wider border border-purple-100">Resume Uploaded</span>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50 p-6 rounded-3xl mb-6 group-hover:scale-110 transition-all duration-300 shadow-inner border border-slate-100">
                      <FileUp className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">1. Upload Resume</h3>
                    <p className="text-sm text-slate-500 font-medium">Must be a PDF file.</p>
                  </>
                )}
                <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
             </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col">
             <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xl font-black text-slate-800">2. Paste Job Description</h3>
                </div>
                <textarea 
                   value={jobDescription}
                   onChange={(e) => setJobDescription(e.target.value)}
                   placeholder="Paste the requirements, skills, and details from the job posting here..."
                   className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-700 outline-none focus:border-purple-500 focus:bg-white transition-all resize-none min-h-[250px]"
                />
                
                {!session ? (
                  <button 
                    onClick={(e) => { e.preventDefault(); signIn("google"); }} 
                    className="w-full mt-6 py-5 font-black text-white bg-slate-800 hover:bg-slate-900 shadow-xl rounded-2xl transition-all flex justify-center items-center gap-3 cursor-pointer"
                  >
                    <Lock className="w-5 h-5" /> Login to Unlock (5 Free/Day)
                  </button>
                ) : (
                  <button 
                    disabled={!file || !jobDescription.trim()}
                    onClick={handleAnalyze} 
                    className="w-full mt-6 py-5 font-black text-white bg-slate-900 hover:bg-purple-600 shadow-xl shadow-purple-200/50 rounded-2xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:hover:bg-slate-900 cursor-pointer"
                  >
                    <Wand2 className="w-5 h-5" /> Analyze Match Score
                  </button>
                )}

             </div>
          </div>
          
        </div>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <div className="relative">
             <Loader2 className="w-20 h-20 text-purple-600 animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center">
               <Wand2 className="w-8 h-8 text-purple-600 animate-pulse" />
             </div>
           </div>
           <h3 className="text-2xl font-black text-slate-800 mt-8">Consulting Gemini AI...</h3>
           <p className="text-slate-500 mt-2 font-medium">Checking keywords and generating ATS feedback...</p>
         </div>
      )}

      {atsResult && !isProcessing && (
        <div className="flex-1 flex flex-col w-full animate-in fade-in slide-in-from-bottom-10 duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">ATS Match Score</h3>
               
               <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                     <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                     <circle 
                       cx="50" cy="50" r="40" 
                       stroke={getScoreStroke(atsResult.score)} 
                       strokeWidth="12" fill="none" 
                       strokeDasharray="251.2" 
                       strokeDashoffset={251.2 - (251.2 * atsResult.score) / 100}
                       className="transition-all duration-1000 ease-out"
                       strokeLinecap="round"
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className={`text-5xl font-black ${getScoreColor(atsResult.score)}`}>{atsResult.score}%</span>
                  </div>
               </div>

               <p className="text-center font-medium text-slate-600 mt-6 max-w-[200px]">
                 {atsResult.score >= 80 ? "Looks great! You are highly likely to pass the ATS filter." : 
                  atsResult.score >= 50 ? "Average match. Add some missing keywords to improve chances." : 
                  "Low match! You need to heavily tailor your resume for this job."}
               </p>
            </div>

            <div className="md:col-span-2 flex flex-col gap-6">
               
               <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <XCircle className="w-6 h-6 text-red-500" />
                    <h3 className="text-lg font-black text-red-900">Missing Keywords ({atsResult.missing.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {atsResult.missing.length === 0 ? (
                       <span className="text-sm font-bold text-red-700 bg-white px-4 py-2 rounded-xl">No missing keywords! Perfect match! 🎉</span>
                     ) : (
                       atsResult.missing.slice(0, 30).map((word, i) => (
                         <span key={i} className="text-sm font-bold text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg shadow-sm">
                           {word}
                         </span>
                       ))
                     )}
                     {atsResult.missing.length > 30 && (
                        <span className="text-sm font-bold text-red-500 px-3 py-1.5">+ {atsResult.missing.length - 30} more</span>
                     )}
                  </div>
               </div>

               <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                    <h3 className="text-lg font-black text-emerald-900">Matched Skills ({atsResult.matched.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {atsResult.matched.length === 0 ? (
                       <span className="text-sm font-bold text-emerald-700 bg-white px-4 py-2 rounded-xl">No keywords matched. Are you sure you uploaded the right resume?</span>
                     ) : (
                       atsResult.matched.slice(0, 30).map((word, i) => (
                         <span key={i} className="text-sm font-bold text-emerald-700 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-sm">
                           {word}
                         </span>
                       ))
                     )}
                  </div>
               </div>
            </div>
          </div>

          {atsResult.aiAdvice && (
            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-[2rem] p-8 mb-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Wand2 className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-black text-indigo-900">Gemini AI Expert Advice</h3>
              </div>
              <div className="prose prose-indigo max-w-none text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                {atsResult.aiAdvice}
              </div>
            </div>
          )}

          <button onClick={() => { setFile(null); setJobDescription(''); setAtsResult(null); setApiError(''); }} className="mx-auto w-full max-w-md py-4 font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-2xl transition-all">
             Scan Another Resume
          </button>

        </div>
      )}

    </div>
  );
}