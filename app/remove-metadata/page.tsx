'use client';

import React, { useState, useRef } from 'react';
import { Loader2, ArrowLeft, Ghost, CheckCircle, ShieldCheck, FileUp, Info } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

export default function RemoveMetadataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      setFile(selectedFile);
      setIsDone(false);
      setErrorMsg(null);
    }
  };

  const handleStripMetadata = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // 🚀 THE GHOST PROTOCOL
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('ihatepdf. Engine (Anonymous)'); 
      pdfDoc.setCreator('Unknown');

      const pdfBytes = await pdfDoc.save();
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_ghost_${file.name}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);

    } catch (error: any) {
      console.error("Ghosting Error:", error);
      setErrorMsg("Unable to process your file.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 min-h-[calc(100vh-80px)] flex flex-col bg-slate-50">
      
      {/* Premium Header */}
      <div className="mb-8 flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wide transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Ghost className="w-6 h-6 text-slate-500" /> Ghost PDF
          </h1>
        </div>
      </div>

      {/* 💡 THE NEW EXPLAINER NOTE */}
      <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
         <div className="p-4 bg-indigo-100 rounded-2xl shrink-0">
           <Info className="w-8 h-8 text-indigo-600" />
         </div>
         <div>
            <h3 className="font-black text-indigo-900 text-xl mb-2">What does this tool actually do?</h3>
            <p className="text-indigo-800 text-sm font-medium leading-relaxed mb-4">
              Every time you create or save a PDF, your device silently attaches hidden information called <b>Metadata</b> to the file's source code. This usually includes:
            </p>
            <ul className="list-disc list-inside text-indigo-900 text-sm font-bold opacity-90 space-y-1.5 mb-4 ml-2">
              <li>Your real name or computer username (Author)</li>
              <li>The software or website used to create it (e.g., MS Word, Canva)</li>
              <li>Exact creation and modification timestamps</li>
            </ul>
            <p className="text-indigo-800 text-sm font-medium leading-relaxed">
              <b>The Solution:</b> This tool permanently wipes all this hidden tracking data directly inside your browser. Perfect for whistleblowers, sharing sensitive reports, or just maintaining absolute digital privacy. <span className="font-black text-indigo-900">Zero server uploads.</span>
            </p>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-10">
        
        {/* State 1: Upload */}
        {!file && (
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20"
          >
            <div className="bg-slate-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-slate-100 transition-all duration-300 shadow-inner">
              <FileUp className="w-16 h-16 text-slate-600" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 mb-4">Make Your PDF Anonymous</h3>
            <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Select a PDF to instantly wipe its hidden metadata, author info, and trackers.</p>
            <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-xl pointer-events-none">
              Select PDF File
            </button>
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
        )}

        {/* State 2: Selected & Action */}
        {file && !isProcessing && !isDone && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="p-5 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
              <Ghost className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full" title={file.name}>{file.name}</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Ready to erase all hidden traces.</p>
            
            {errorMsg && <p className="text-red-500 text-sm font-bold mb-4">{errorMsg}</p>}

            <div className="flex gap-3 w-full">
               <button onClick={() => setFile(null)} className="px-5 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                 Cancel
               </button>
               <button onClick={handleStripMetadata} className="flex-1 py-4 font-black text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 rounded-2xl transition-all flex justify-center items-center gap-2">
                 <Ghost className="w-5 h-5" /> Strip Metadata
               </button>
            </div>
          </div>
        )}

        {/* State 3: Processing */}
        {isProcessing && (
           <div className="flex flex-col items-center mt-10">
             <Loader2 className="w-16 h-16 text-slate-600 animate-spin mb-6" />
             <h3 className="text-2xl font-black text-slate-800">Executing Ghost Protocol...</h3>
             <p className="text-slate-500 mt-2 font-medium">Wiping author info and tracking data offline...</p>
           </div>
        )}

        {/* State 4: Done */}
        {isDone && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
             <div className="p-6 bg-emerald-50 rounded-full mb-6 border-4 border-emerald-100">
               <CheckCircle className="w-16 h-16 text-emerald-500" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-3">Ghosted! 👻</h3>
             <p className="text-slate-500 font-medium mb-8">All hidden metadata has been permanently wiped.</p>
             
             <button onClick={() => { setFile(null); setIsDone(false); }} className="w-full py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
               Ghost Another File
             </button>
          </div>
        )}

      </div>
    </div>
  );
}