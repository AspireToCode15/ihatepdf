'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, ScanText, FileUp, Sparkles, Copy, Download, CheckCircle, FileImage, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSession, signIn } from "next-auth/react"; // 🚀 Session import kiya

export default function SmartOCRPage() {
  const { data: session } = useSession(); // 🚀 Login check
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [apiError, setApiError] = useState(''); // 🚀 Paywall banner state

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load pdf.js engine
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
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf' && !selectedFile.type.startsWith('image/')) {
         setApiError("Bhai, sirf PDF ya Image (JPG/PNG) allow hai!");
         return;
      }
      setFile(selectedFile);
      setExtractedText('');
      setApiError('');
    }
  };

  const processOCR = async () => {
    if (!file) return;
    setIsProcessing(true);
    setApiError('');

    try {
      const base64Images: string[] = [];

      // 🖼️ Step 1: Convert File to Images (Offline)
      if (file.type === 'application/pdf') {
          const pdfjsLib = (window as any).pdfjsLib;
          const arrayBuffer = await file.arrayBuffer();
          const typedArray = new Uint8Array(arrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          
          const pagesToProcess = Math.min(pdf.numPages, 5); 

          for (let i = 1; i <= pagesToProcess; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 }); 
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (ctx) {
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                base64Images.push(base64);
            }
          }
      } else {
          // Direct Image Upload
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
          });
          base64Images.push(base64);
      }

      // 🧠 Step 2: Send Images to SECURE BACKEND TOLLBOOTH
      const response = await fetch('/api/ai/smart-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Images }),
      });
      
      const apiData = await response.json();

      if (!response.ok) {
        setApiError(apiData.error || "Server issue. Please try again.");
        setIsProcessing(false);
        return; 
      }
      
      setExtractedText(apiData.data);
      setIsProcessing(false);

    } catch (error) {
      console.error("OCR Error:", error);
      setApiError("Network connection error ya file bohot badi hai.");
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Extracted_Text_${file?.name}.txt`;
    link.click();
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
            <ScanText className="w-6 h-6 text-indigo-600" /> Smart OCR
          </h1>
        </div>
      </div>

      {/* 🚀 GRACEFUL ERROR BANNER (Tollbooth Paywall) */}
      {apiError && (
        <div className="mb-8 bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold animate-in zoom-in-95">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p>{apiError}</p>
        </div>
      )}

      {!extractedText && !isProcessing && (
        <>
          <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
             <div className="p-4 bg-indigo-100 rounded-2xl shrink-0">
               <FileImage className="w-8 h-8 text-indigo-600" />
             </div>
             <div>
                <h3 className="font-black text-indigo-900 text-xl mb-2">Give Eyes to Your Documents</h3>
                <p className="text-indigo-800 text-sm font-medium leading-relaxed mb-4">
                  Got a scanned PDF, a photo of a textbook, or handwritten notes? Upload it here. Our Vision AI will "look" at the images and extract 100% editable text from them instantly.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                  <Sparkles className="w-4 h-4" /> Powered by Gemini Vision
                </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pb-10">
            <div className="w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-10 shadow-sm flex flex-col items-center text-center">
              
              {!file ? (
                 <div 
                   onClick={() => isEngineReady && session && fileInputRef.current?.click()} 
                   className={`w-full flex flex-col items-center justify-center ${session ? 'cursor-pointer hover:border-indigo-300' : ''} group py-10 ${!isEngineReady && 'opacity-50'}`}
                 >
                   <div className="bg-indigo-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-inner">
                     <FileUp className="w-16 h-16 text-indigo-600" />
                   </div>
                   <h3 className="text-3xl font-black text-slate-800 mb-4">Upload Scanned PDF or Image</h3>
                   <p className="text-slate-500 font-medium mb-8 max-w-md">Drop your non-selectable documents here.</p>
                   
                   {/* 🚀 THE GRACEFUL LOGIN LOCK */}
                   {!session ? (
                     <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); signIn("google"); }} className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-xl flex items-center gap-2">
                       <Lock className="w-5 h-5" /> Login to Unlock (5 Free/Day)
                     </button>
                   ) : (
                     <button className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-xl pointer-events-none">
                       Select File
                     </button>
                   )}
                 </div>
              ) : (
                 <div className="w-full flex flex-col items-center justify-center py-10 animate-in zoom-in-95">
                   <div className="p-4 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
                     <ScanText className="w-10 h-10 text-white" />
                   </div>
                   <h3 className="font-black text-slate-800 text-xl mb-1 truncate w-full px-4" title={file.name}>{file.name}</h3>
                   <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider mb-8">Ready for AI Vision</span>
                   
                   <div className="flex gap-4 w-full max-w-md">
                     <button onClick={() => setFile(null)} className="flex-1 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                       Cancel
                     </button>
                     <button onClick={processOCR} className="flex-1 py-4 font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 rounded-2xl transition-all flex justify-center items-center gap-2">
                       <Sparkles className="w-5 h-5" /> Extract Text
                     </button>
                   </div>
                 </div>
              )}
              <input type="file" accept="application/pdf,image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        </>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600"></div>
              <ScanText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-600 animate-pulse" />
           </div>
           <h3 className="text-2xl font-black text-slate-800">AI is reading your document...</h3>
           <p className="text-slate-500 mt-2 font-medium max-w-md text-center">Converting pixels into editable text. This might take a few seconds...</p>
         </div>
      )}

      {/* 🟢 THE EXTRACTED TEXT DASHBOARD */}
      {extractedText && !isProcessing && (
        <div className="flex-1 flex flex-col w-full animate-in fade-in slide-in-from-bottom-10 duration-500">
          
          <div className="bg-white rounded-t-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border-b-0">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-100 rounded-full">
                 <CheckCircle className="w-6 h-6 text-emerald-600" />
               </div>
               <h2 className="text-xl font-black text-slate-800">Text Extracted Successfully</h2>
             </div>
             
             <div className="flex gap-3 w-full sm:w-auto">
               <button onClick={copyToClipboard} className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                 {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                 {isCopied ? 'Copied!' : 'Copy Text'}
               </button>
               <button onClick={downloadText} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                 <Download className="w-4 h-4" /> Download .txt
               </button>
             </div>
          </div>

          {/* Text Editor Area */}
          <div className="bg-white border border-slate-200 rounded-b-3xl shadow-sm overflow-hidden mb-8 flex-1 min-h-[400px] flex flex-col">
             <textarea 
               value={extractedText}
               onChange={(e) => setExtractedText(e.target.value)}
               className="w-full flex-1 p-8 text-slate-700 leading-relaxed font-medium outline-none resize-none bg-slate-50/50"
             />
          </div>

          <button onClick={() => { setFile(null); setExtractedText(''); setApiError(''); }} className="mx-auto w-full max-w-md py-4 font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-2xl transition-all">
             Extract Another Document
          </button>

        </div>
      )}

    </div>
  );
}