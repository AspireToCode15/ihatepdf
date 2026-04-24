'use client';

import React, { useState, useRef } from 'react';
import { Loader2, ArrowLeft, FileText, CheckCircle, FileOutput } from 'lucide-react';
import Link from 'next/link';
import mammoth from 'mammoth';

export default function WordToPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!selectedFile.name.endsWith('.docx')) {
        return alert("Only .docx files are allowed!");
      }
      
      setFile(selectedFile);
      setIsDone(false);
      setIsProcessing(true);

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        
        // 🚀 MAMMOTH ENGINE: Convert Word to HTML
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        setHtmlContent(result.value);
        setIsProcessing(false);
      } catch (error) {
        console.error("Extraction Error:", error);
        alert("Error processing your Word file!");
        setIsProcessing(false);
      }
    }
  };

  // ☢️ THE QUARANTINE ENGINE (Fixed: Off-screen instead of display:none)
  const handleConvert = () => {
    setIsProcessing(true);

    // 1. Create iframe but push it off-screen (so it technically renders!)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';  // 🔥 FIX: Hide it off-screen
    iframe.style.left = '-9999px'; // 🔥 FIX: Hide it off-screen
    iframe.style.width = '800px';  // Keep standard A4 width
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
        alert("Error creating PDF!");
        setIsProcessing(false);
        return;
    }

    const safeFilename = file?.name ? file.name.replace('.docx', '') : 'document';

    // 2. Listener for when the iframe finishes downloading the PDF
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'PDF_DONE') {
        setIsDone(true);
        setIsProcessing(false);
        document.body.removeChild(iframe); // Clean up
        window.removeEventListener('message', handleMessage);
      } else if (event.data === 'PDF_ERROR') {
        alert("Engine crashed inside isolation!");
        setIsProcessing(false);
        document.body.removeChild(iframe);
        window.removeEventListener('message', handleMessage);
      }
    };
    window.addEventListener('message', handleMessage);

    // 3. Inject content and PDF library into the iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11pt; 
              line-height: 1.5; 
              color: #000000; 
              background-color: #ffffff; 
              padding: 40px; 
            }
            h1, h2, h3 { color: #111827; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            td, th { border: 1px solid #000000; padding: 8px; }
            p { margin-bottom: 15px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div id="pdf-content">${htmlContent}</div>
          <script>
            // Check every 100ms if library loaded, then run
            function runPDF() {
              if (typeof window.html2pdf === 'undefined') {
                setTimeout(runPDF, 100);
                return;
              }
              var opt = {
                margin:       0.75,
                filename:     'ihatepdf_converted_${safeFilename}.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
              };
              
              // Tell html2pdf to grab the content and save
              window.html2pdf().set(opt).from(document.getElementById('pdf-content')).save()
                .then(function() {
                  window.parent.postMessage('PDF_DONE', '*');
                })
                .catch(function(err) {
                  window.parent.postMessage('PDF_ERROR', '*');
                });
            }
            runPDF();
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 min-h-[calc(100vh-80px)] flex flex-col bg-slate-50">
      
      <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 uppercase transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileOutput className="w-5 h-5 text-indigo-500" /> Word to PDF
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        
        {!file && (
          <div className="w-full max-w-3xl bg-white border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all hover:border-indigo-400">
            <div onClick={() => fileInputRef.current?.click()} className="p-20 flex flex-col items-center w-full cursor-pointer group">
              <div className="bg-indigo-100 p-8 rounded-full mb-6 group-hover:scale-110 group-hover:bg-indigo-200 transition-all duration-300 shadow-inner">
                <FileText className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Word to PDF Converter</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Make DOC and DOCX files easy to read by converting them to PDF. 100% Offline.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition shadow-xl pointer-events-none">
                Select Word File
              </button>
              <input type="file" accept=".docx" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        )}

        {file && !isProcessing && htmlContent && (
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-10 shadow-sm flex flex-col items-center text-center transition-all animate-in zoom-in-95 duration-300">
            {isDone ? (
              <>
                <div className="p-6 bg-emerald-50 rounded-full mb-6 border-4 border-emerald-100">
                  <CheckCircle className="w-16 h-16 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-3">Conversion Complete!</h3>
                <p className="text-slate-500 font-medium mb-8">Your Word file has been successfully converted to PDF format.</p>
              </>
            ) : (
              <>
                <div className="p-6 bg-indigo-50 rounded-full mb-6 border-4 border-indigo-100">
                  <FileOutput className="w-16 h-16 text-indigo-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-3">File Ready</h3>
                <p className="text-slate-500 font-medium mb-8"><b>{file.name}</b> is ready to be converted.</p>
              </>
            )}

            <div className="flex gap-4 w-full">
               <button onClick={() => { setFile(null); setHtmlContent(''); setIsDone(false); }} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                 Convert Another
               </button>
               
               {!isDone && (
                 <button onClick={handleConvert} className="flex-1 py-4 font-black text-white bg-indigo-600 hover:bg-slate-900 shadow-xl shadow-indigo-200 rounded-xl transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
                   Convert to PDF
                 </button>
               )}
            </div>
          </div>
        )}

        {isProcessing && (
           <div className="flex flex-col items-center">
             <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
             <h3 className="text-2xl font-black text-slate-800">Converting Document...</h3>
             <p className="text-slate-500 mt-2">Baking layout in Isolation Chamber...</p>
           </div>
        )}

      </div>
    </div>
  );
}