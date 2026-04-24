'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Droplet, CheckCircle, FileUp, Download, Info, Printer } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';

export default function InkSaverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load pdf.js engine
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
    }
  };

  const handleConvertToInkSaver = async () => {
    if (!file) return;
    setIsProcessing(true);

    const pdfjsLib = (window as any).pdfjsLib;
    let pdfDoc: jsPDF | null = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Scale 2 for Crisp Printing Quality
        const viewport = page.getViewport({ scale: 2 }); 
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;

        // Draw original colored page
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // 🚀 THE GRAYSCALE LUMINANCE ALGORITHM
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let j = 0; j < data.length; j += 4) {
          const r = data[j];
          const g = data[j+1];
          const b = data[j+2];

          // Human perception formula for accurate Grayscale
          const gray = (r * 0.299) + (g * 0.587) + (b * 0.114);

          data[j] = gray;     // R
          data[j+1] = gray;   // G
          data[j+2] = gray;   // B
          // Alpha data[j+3] remains untouched
        }

        ctx.putImageData(imgData, 0, 0);
        
        // High quality JPEG compression for printing
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';

        // Add to new PDF
        if (i === 1) {
          pdfDoc = new jsPDF({ orientation: orientation, unit: 'px', format: [viewport.width, viewport.height] });
        } else if (pdfDoc) {
          pdfDoc.addPage([viewport.width, viewport.height], orientation);
        }

        if (pdfDoc) {
          pdfDoc.addImage(imgDataUrl, 'JPEG', 0, 0, viewport.width, viewport.height);
        }
      }

      if (pdfDoc) {
        pdfDoc.save(`ihatepdf_inksaver_${file.name}`);
      }

      setIsDone(true);
      setIsProcessing(false);

    } catch (error) {
      console.error("Ink Saver Error:", error);
      alert("Something went wrong!");
      setIsProcessing(false);
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
            <Droplet className="w-6 h-6 text-cyan-500" /> Ink Saver
          </h1>
        </div>
      </div>

      {/* Explainer Note */}
      <div className="mb-10 bg-cyan-50 border border-cyan-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
         <div className="p-4 bg-cyan-100 rounded-2xl shrink-0">
           <Printer className="w-8 h-8 text-cyan-600" />
         </div>
         <div>
            <h3 className="font-black text-cyan-900 text-xl mb-2">Save Money on Printing</h3>
            <p className="text-cyan-800 text-sm font-medium leading-relaxed mb-4">
              Colored printouts are incredibly expensive. Before printing your notes, assignments, or ebooks, drop them here. Our engine perfectly converts all colors to Grayscale (Black & White) while maintaining razor-sharp text quality.
            </p>
            <p className="text-cyan-800 text-sm font-bold">
              💡 Processed 100% locally in your browser. Fast, free, and secure.
            </p>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-10">
        
        {!file && (
          <div 
            onClick={() => isEngineReady && fileInputRef.current?.click()} 
            className={`w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 hover:border-cyan-300 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
          >
            <div className="bg-cyan-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-cyan-100 transition-all duration-300 shadow-inner">
              <Droplet className="w-16 h-16 text-cyan-600" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 mb-4">Convert to B&W</h3>
            <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Upload any colored PDF to strip the colors and save printer ink.</p>
            <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-cyan-600 transition shadow-xl pointer-events-none">
              Select PDF File
            </button>
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
        )}

        {file && !isProcessing && !isDone && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="p-5 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
              <Droplet className="w-12 h-12 text-cyan-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full" title={file.name}>{file.name}</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Ready to remove all colors.</p>
            
            <div className="flex gap-3 w-full">
               <button onClick={() => setFile(null)} className="px-5 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                 Cancel
               </button>
               <button onClick={handleConvertToInkSaver} className="flex-1 py-4 font-black text-white bg-slate-900 hover:bg-cyan-600 shadow-xl shadow-cyan-200 rounded-2xl transition-all flex justify-center items-center gap-2">
                 <Droplet className="w-5 h-5" /> Strip Colors
               </button>
            </div>
          </div>
        )}

        {isProcessing && (
           <div className="flex flex-col items-center mt-10">
             <Loader2 className="w-16 h-16 text-cyan-600 animate-spin mb-6" />
             <h3 className="text-2xl font-black text-slate-800">Saving Ink...</h3>
             <p className="text-slate-500 mt-2 font-medium">Applying Grayscale Luminance offline...</p>
           </div>
        )}

        {isDone && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
             <div className="p-6 bg-emerald-50 rounded-full mb-6 border-4 border-emerald-100">
               <CheckCircle className="w-16 h-16 text-emerald-500" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-3">Converted! 🖨️</h3>
             <p className="text-slate-500 font-medium mb-8">Your file is now Black & White. Ready for cheap printing!</p>
             
             <button onClick={() => { setFile(null); setIsDone(false); }} className="w-full py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
               Convert Another File
             </button>
          </div>
        )}
      </div>
    </div>
  );
}