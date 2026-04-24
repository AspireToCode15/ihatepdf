'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Download, ArrowLeft, FileText, CheckCircle, FileUp, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';

export default function PDFToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [extractedWordHtml, setExtractedWordHtml] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. ENGINE LOADER
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
      
      if (selectedFile.type !== 'application/pdf') {
        return alert("Only pdfs are allowed!");
      }
      
      setFile(selectedFile);
      setIsDone(false);
      setIsProcessing(true);

      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) return alert("Loading assets please wait!");

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        const numPages = pdf.numPages;
        let finalHtmlString = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>Export HTML To Doc</title></head>
          <body style="font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #000000; line-height: 1.5;">
        `;

        let totalExtractedItems = 0; // 🔥 THE NEW TRACKER

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          totalExtractedItems += textContent.items.length; // Count words/items found

          let pageHtml = `<div style="page-break-after: always; margin-bottom: 30px;">`;
          const items = textContent.items.sort((a: any, b: any) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

          let lastY = -1;
          let currentLine = '';

          items.forEach((item: any) => {
            const y = item.transform[5]; 
            if (lastY !== -1 && Math.abs(lastY - y) > 6) {
              if (currentLine.trim() !== '') {
                 pageHtml += `<p style="margin: 0 0 10px 0;">${currentLine}</p>`;
              }
              currentLine = '';
            }
            currentLine += item.str + ' ';
            lastY = y;
          });

          if (currentLine.trim() !== '') {
             pageHtml += `<p style="margin: 0 0 10px 0;">${currentLine}</p>`;
          }

          pageHtml += `</div>`;
          finalHtmlString += pageHtml;
        }

        finalHtmlString += `</body></html>`;

        // 🔥 THE SAFETY CHECK
        if (totalExtractedItems === 0) {
           alert("CRITICAL ERROR: Cannot process scanned pdfs!!");
           setFile(null);
           setIsProcessing(false);
           return;
        }
        
        setExtractedWordHtml(finalHtmlString);
        setIsProcessing(false);
        
      } catch (error) {
        console.error("Extraction Error:", error);
        alert("error processing your file!");
        setIsProcessing(false);
      }
    }
  };

  const handleConvert = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      // Use exact ms-word mimetype for better compatibility
      const blob = new Blob(['\ufeff', extractedWordHtml], {
          type: 'application/vnd.ms-word;charset=utf-8'
      });
      
      const safeFilename = file?.name ? file.name.replace('.pdf', '') : 'document';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_converted_${safeFilename}.doc`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsDone(true);
      setIsProcessing(false);
    }, 1000); 
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
            <FileText className="w-5 h-5 text-indigo-500" /> PDF to Word <span className="ml-2 bg-indigo-100 text-indigo-600 text-[10px] px-2 py-1 rounded-md uppercase font-black tracking-widest">Beta Engine</span>
          </h1>
        </div>
      </div>

      <div className="mb-8 bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
         <div className="p-2 bg-amber-100 rounded-full shrink-0">
           <Info className="w-6 h-6 text-amber-600" />
         </div>
         <div>
            <h3 className="font-black text-amber-900 text-lg mb-1">Developer Note: 100% Free & Serverless Engine</h3>
            <p className="text-amber-800 text-sm font-medium leading-relaxed mb-2">
              Unlike other platforms, <b>ihatepdf</b> processes your files entirely inside your browser. We do not upload your sensitive documents to any cloud servers. This means zero wait times and complete privacy.
            </p>
            <p className="text-amber-800 text-sm font-bold opacity-80">
              💡 For Best Results: This offline engine works magically for text-heavy documents. <b>It cannot convert Scanned PDFs or Images.</b>
            </p>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-10">
        
        {!file && (
          <div className="w-full max-w-3xl bg-white border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all hover:border-indigo-400">
            {!isEngineReady && (
              <div className="flex flex-col items-center justify-center p-20 z-10 bg-white/80 backdrop-blur-sm absolute inset-0">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h3 className="text-2xl font-black text-slate-800">Initializing Extraction Engine...</h3>
              </div>
            )}
            <div onClick={() => isEngineReady && fileInputRef.current?.click()} className={`p-16 flex flex-col items-center w-full ${!isEngineReady ? 'opacity-20 pointer-events-none' : 'cursor-pointer group'}`}>
              <div className="bg-indigo-100 p-8 rounded-full mb-6 group-hover:scale-110 group-hover:bg-indigo-200 transition-all duration-300 shadow-inner">
                <FileUp className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Convert PDF to Word</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Extract text and paragraphs from your PDF into an editable Word document instantly.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition shadow-xl pointer-events-none">
                Select PDF File
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        )}

        {file && !isProcessing && extractedWordHtml && (
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-10 shadow-sm flex flex-col items-center text-center transition-all animate-in zoom-in-95 duration-300">
            {isDone ? (
              <>
                <div className="p-6 bg-emerald-50 rounded-full mb-6 border-4 border-emerald-100">
                  <CheckCircle className="w-16 h-16 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-3">Document Ready!</h3>
                <p className="text-slate-500 font-medium mb-8">Your PDF has been processed and saved as a Word document.</p>
              </>
            ) : (
              <>
                <div className="p-6 bg-indigo-50 rounded-full mb-6 border-4 border-indigo-100">
                  <FileText className="w-16 h-16 text-indigo-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-3">Extraction Successful</h3>
                <p className="text-slate-500 font-medium mb-8"><b>{file.name}</b> is ready to be baked into a Word file.</p>
              </>
            )}

            <div className="flex gap-4 w-full">
               <button onClick={() => { setFile(null); setExtractedWordHtml(''); setIsDone(false); }} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                 Convert Another
               </button>
               
               {!isDone && (
                 <button onClick={handleConvert} className="flex-1 py-4 font-black text-white bg-indigo-600 hover:bg-slate-900 shadow-xl shadow-indigo-200 rounded-xl transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
                   Download Word File
                 </button>
               )}
            </div>
          </div>
        )}

        {isProcessing && (
           <div className="flex flex-col items-center mt-10">
             <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
             <h3 className="text-2xl font-black text-slate-800">Generating Word File...</h3>
             <p className="text-slate-500 mt-2">Baking offline document structure...</p>
           </div>
        )}

      </div>
    </div>
  );
}