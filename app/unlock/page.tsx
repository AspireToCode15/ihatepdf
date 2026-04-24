'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Lock, CheckCircle, ShieldCheck, KeyRound, FileUp } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';

export default function UnlockPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. ENGINE LOADER (pdf.js for unlocking)
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
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      setFile(selectedFile);
      setIsDone(false);
      setErrorMsg(null);
      setPassword('');
    }
  };

  const handleUnlock = async () => {
    if (!file) return;
    if (!password) {
        setErrorMsg("Please enter the password!");
        return;
    }

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return alert("Loading assets please wait!");

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // 🚀 THE DECRYPTION ENGINE (Opens PDF with provided password)
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, password: password });
      const pdf = await loadingTask.promise;
      
      // If we reach here, password is CORRECT! Now we bake the new PDF.
      let pdfDoc: any = null;

      // Loop through all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
        // Use scale 2 or 3 for HD Quality text (so Aadhar/Bank statement looks crisp)
        const viewport = page.getViewport({ scale: 2.5 }); 
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render page onto canvas
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Convert canvas to image data
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';

        // Initialize jsPDF on first page, then add pages
        if (i === 1) {
          pdfDoc = new jsPDF({ orientation: orientation, unit: 'px', format: [viewport.width, viewport.height] });
        } else {
          pdfDoc.addPage([viewport.width, viewport.height], orientation);
        }

        // Paste HD image onto the new PDF page
        pdfDoc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
      }

      // Save the brand new, password-free PDF!
      const safeFilename = file.name.replace('.pdf', '');
      pdfDoc.save(`ihatepdf_unlocked_${safeFilename}.pdf`);

      setIsDone(true);
      setIsProcessing(false);

    } catch (error: any) {
      console.error("Unlock Error:", error);
      
      // 🛡️ SMART ERROR HANDLING FOR WRONG PASSWORD
      if (error.name === 'PasswordException') {
          setErrorMsg("Wrong password! Please try again.");
      } else {
          setErrorMsg("Error: Unable to process your file.");
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 min-h-[calc(100vh-80px)] flex flex-col bg-slate-50">
      
      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 uppercase transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" /> Unlock PDF <span className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-md uppercase font-black tracking-widest">Offline Safe</span>
          </h1>
        </div>
      </div>

      <div className="mb-8 bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
         <div className="p-2 bg-emerald-100 rounded-full shrink-0">
           <ShieldCheck className="w-6 h-6 text-emerald-600" />
         </div>
         <div>
            <h3 className="font-black text-emerald-900 text-lg mb-1">100% Secure & Offline</h3>
            <p className="text-emerald-800 text-sm font-medium leading-relaxed mb-2">
              Perfect for Bank Statements, Payslips, and Aadhar Cards. We verify the password and rebuild the PDF entirely <b>inside your browser</b>.
            </p>
            <p className="text-emerald-800 text-sm font-bold opacity-80">
              💡 Note: To ensure total offline privacy, the resulting file is saved as a High-Quality Flat PDF (text cannot be copied, but perfectly crisp for printing and sharing).
            </p>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-10">
        
        {!file && (
          <div className="w-full max-w-3xl bg-white border-2 border-dashed border-emerald-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all hover:border-emerald-400">
            
            {!isEngineReady && (
              <div className="flex flex-col items-center justify-center p-20 z-10 bg-white/80 backdrop-blur-sm absolute inset-0">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                <h3 className="text-2xl font-black text-slate-800">Initializing Crypto Engine...</h3>
              </div>
            )}

            <div onClick={() => isEngineReady && fileInputRef.current?.click()} className={`p-16 flex flex-col items-center w-full ${!isEngineReady ? 'opacity-20 pointer-events-none' : 'cursor-pointer group'}`}>
              <div className="bg-emerald-50 p-8 rounded-full mb-6 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300 shadow-inner">
                <FileUp className="w-16 h-16 text-emerald-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Unlock PDF Offline</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Remove PDF passwords directly on your device. Zero uploads. Max privacy.</p>
              <button className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-900 transition shadow-xl pointer-events-none">
                Select Locked PDF
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        )}

        {file && (
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            
            {isDone ? (
              <>
                <div className="p-5 bg-emerald-50 rounded-full mb-4 border-4 border-emerald-100">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Unlocked & Saved!</h3>
                <p className="text-slate-500 text-sm mb-6">File has been stripped of its password.</p>
                <button onClick={() => { setFile(null); setIsDone(false); setPassword(''); }} className="w-full py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                  Unlock Another File
                </button>
              </>
            ) : (
              <>
                <div className="p-4 bg-slate-50 rounded-full mb-4 border border-slate-100">
                  <Lock className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1 truncate w-full" title={file.name}>{file.name}</h3>
                <p className="text-slate-500 text-sm mb-6">This file is protected. Enter password to unlock offline.</p>
                
                <div className="w-full relative mb-6">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password" 
                    placeholder="Enter file password..." 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 font-medium focus:outline-none transition-colors ${errorMsg ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-slate-200 focus:border-emerald-500 bg-slate-50'}`}
                  />
                  {errorMsg && <p className="text-red-500 text-xs font-bold mt-2 text-left">{errorMsg}</p>}
                </div>

                <div className="flex gap-3 w-full">
                   <button onClick={() => { setFile(null); setErrorMsg(null); }} className="px-4 py-3 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                     Cancel
                   </button>
                   <button onClick={handleUnlock} disabled={isProcessing || !password} className="flex-1 py-3 font-black text-white bg-emerald-600 hover:bg-slate-900 shadow-xl shadow-emerald-200 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none">
                     {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</> : 'Remove Password'}
                   </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}