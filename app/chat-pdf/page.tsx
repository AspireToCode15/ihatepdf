'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, MessageSquareText, FileText, Send, User, Sparkles, FileUp, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSession, signIn } from "next-auth/react"; // 🚀 Auth import

export default function ChatPDFPage() {
  const { data: session } = useSession(); // 🚀 Session check
  const [file, setFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [apiError, setApiError] = useState(''); // 🚀 Paywall banner state
  
  // Chat States
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only PDFs are allowed!");
      
      setFile(selectedFile);
      setMessages([]);
      setApiError('');
      extractTextFromPDF(selectedFile);
    }
  };

  // 1. Extract Text Offline
  const extractTextFromPDF = async (pdfFile: File) => {
    setIsExtracting(true);
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      const arrayBuffer = await pdfFile.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }

      if (fullText.trim().length < 20) {
          alert("Unable to access text in your PDF. Try another one.");
      }

      setPdfText(fullText);
      setMessages([{ role: 'ai', text: `Hi! I have read "${pdfFile.name}". What would you like to know about this document?` }]);
      setIsExtracting(false);
    } catch (error) {
      console.error("Extraction Error:", error);
      alert("Something went wrong processing the file!");
      setIsExtracting(false);
    }
  };

  // 2. Chat with SECURE BACKEND
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !pdfText) return;

    const userMessage = input.trim();
    setInput('');
    setApiError('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      // 🚀 Secure Backend Call (Bouncer check hoga yahan)
      const response = await fetch('/api/ai/chat-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfText, userMessage }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error);
        setMessages(prev => [...prev, { role: 'ai', text: `🛑 System Error: ${data.error}` }]);
        setIsTyping(false);
        return;
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.data }]);
    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered a network error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
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
            <MessageSquareText className="w-6 h-6 text-fuchsia-600" /> Chat with PDF
          </h1>
        </div>
      </div>

      {/* 🚀 GRACEFUL ERROR BANNER */}
      {apiError && (
        <div className="mb-8 bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold animate-in zoom-in-95">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p>{apiError}</p>
        </div>
      )}

      {!file && (
        <>
          <div className="mb-10 bg-fuchsia-50 border border-fuchsia-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
             <div className="p-4 bg-fuchsia-100 rounded-2xl shrink-0">
               <Sparkles className="w-8 h-8 text-fuchsia-600" />
             </div>
             <div>
                <h3 className="font-black text-fuchsia-900 text-xl mb-2">Your Personal AI Tutor</h3>
                <p className="text-fuchsia-800 text-sm font-medium leading-relaxed mb-4">
                  Powered by Google Gemini AI. Upload any book, report, or notes, and ask questions like "Summarize the 2nd chapter" or "What is the main formula here?". 
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-fuchsia-700 text-xs font-bold rounded-lg border border-fuchsia-200">
                  <ShieldCheck className="w-4 h-4" /> Secure Document Processing
                </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pb-10">
            <div 
              onClick={() => isEngineReady && session && fileInputRef.current?.click()} 
              className={`w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 ${session ? 'hover:border-fuchsia-300 cursor-pointer' : ''} rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
            >
              <div className="bg-fuchsia-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-fuchsia-100 transition-all duration-300 shadow-inner">
                <FileUp className="w-16 h-16 text-fuchsia-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Upload PDF to Chat</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Our AI will read the document instantly so you can start asking questions.</p>
              
              {/* 🚀 THE GRACEFUL LOGIN LOCK */}
              {!session ? (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); signIn("google"); }} 
                  className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-xl flex items-center gap-2"
                >
                  <Lock className="w-5 h-5" /> Login to Unlock (5 Free/Day)
                </button>
              ) : (
                <button className="bg-fuchsia-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-fuchsia-700 transition shadow-xl pointer-events-none">
                  Select Document
                </button>
              )}

              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        </>
      )}

      {/* 🟢 THE CHAT INTERFACE */}
      {file && (
        <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden h-[70vh]">
           
           {/* Chat Header */}
           <div className="bg-slate-50 border-b border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-fuchsia-100 rounded-lg">
                   <FileText className="w-5 h-5 text-fuchsia-600" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 text-sm max-w-xs truncate" title={file.name}>{file.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{isExtracting ? 'Reading document...' : 'AI Ready to chat'}</p>
                 </div>
              </div>
              <button onClick={() => { setFile(null); setPdfText(''); setApiError(''); }} className="text-sm font-bold text-slate-500 hover:text-red-500 transition-colors">
                Close Chat
              </button>
           </div>

           {/* Chat Messages Area */}
           <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {isExtracting ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin text-fuchsia-600 mb-4" />
                    <p className="font-medium">AI is absorbing the document...</p>
                 </div>
              ) : (
                 messages.map((msg, idx) => (
                   <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-200' : 'bg-fuchsia-100'}`}>
                         {msg.role === 'user' ? <User className="w-5 h-5 text-slate-600" /> : <Sparkles className="w-5 h-5 text-fuchsia-600" />}
                      </div>
                      <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-sm shadow-md' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                         {msg.text}
                      </div>
                   </div>
                 ))
              )}
              {isTyping && (
                 <div className="flex gap-4 max-w-[85%] mr-auto">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-fuchsia-100 shadow-sm">
                       <Sparkles className="w-5 h-5 text-fuchsia-600" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 rounded-tl-sm shadow-sm flex items-center gap-2">
                       <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce"></span>
                       <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                       <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                    </div>
                 </div>
              )}
              <div ref={chatEndRef} />
           </div>

           {/* Chat Input */}
           <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                 <textarea 
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                   placeholder={isExtracting ? "Wait, AI is reading..." : "Ask a question about the document..."}
                   disabled={isExtracting || isTyping}
                   className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 outline-none focus:border-fuchsia-500 focus:bg-white transition-all resize-none max-h-32 min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
                   rows={1}
                 />
                 <button 
                   type="submit" 
                   disabled={!input.trim() || isExtracting || isTyping}
                   className="w-14 h-14 bg-fuchsia-600 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-all shadow-xl shadow-fuchsia-200 disabled:opacity-50 disabled:hover:bg-fuchsia-600 disabled:shadow-none shrink-0"
                 >
                   <Send className="w-6 h-6 ml-1" />
                 </button>
              </form>
           </div>

        </div>
      )}

    </div>
  );
}