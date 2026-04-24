'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Download, ArrowLeft, FileArchive, Settings2, Percent, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { jsPDF } from 'jspdf';

export default function CompressPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'recommended' | 'extreme'>('recommended');
  
  // Stats for the user
  const [progress, setProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState<string>('0 KB');
  const [newSize, setNewSize] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. ENGINE LOADER (pdf.js for reading)
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      setFile(selectedFile);
      setOriginalSize(formatBytes(selectedFile.size));
      setIsDone(false);
      setNewSize(null);
      setProgress(0);
    }
  };

  // 🔥 THE COMPRESSION ENGINE
  const handleCompress = async () => {
    if (!file) return;
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return alert("Engine is loading please wait!");

    setIsProcessing(true);
    setProgress(10); // Start progress

    try {
      // Step 1: Read original PDF
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // Compression Settings
      let scale = 1.0;
      let jpegQuality = 0.6;

      if (compressionLevel === 'extreme') {
        scale = 0.8; // Reduce resolution
        jpegQuality = 0.3; // Low quality JPEG
      } else if (compressionLevel === 'recommended') {
        scale = 1.2; // Keep decent resolution
        jpegQuality = 0.6; // Medium quality JPEG
      } else if (compressionLevel === 'low') {
        scale = 1.5; // High resolution
        jpegQuality = 0.9; // High quality JPEG
      }

      let newPdf: jsPDF | null = null;

      // Step 2: Loop through pages, convert to Optimized JPEG, and add to new PDF
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Canvas context failed");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // BAKE THE IMAGE (This compresses the data!)
        const imgData = canvas.toDataURL('image/jpeg', jpegQuality);

        // Convert dimensions to points (pt) for jsPDF
        // jsPDF assumes 72 DPI. We calculate physical size to keep aspect ratio perfect.
        const pdfWidth = (viewport.width * 72) / (96 * scale); 
        const pdfHeight = (viewport.height * 72) / (96 * scale);

        if (i === 1) {
            // First page initializes the PDF with correct dimensions
            newPdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [pdfWidth, pdfHeight]
            });
        } else {
            // Add subsequent pages with their specific dimensions
            newPdf!.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? 'landscape' : 'portrait');
        }

        // Drop the compressed image onto the PDF page
        newPdf!.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // Update progress bar
        setProgress(Math.round(((i) / numPages) * 100));
      }

      if (!newPdf) throw new Error("Compression failed");

      // Step 3: Save and Download
      const pdfOutput = newPdf.output('blob');
      setNewSize(formatBytes(pdfOutput.size));
      
      const url = URL.createObjectURL(pdfOutput);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_compressed_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);
      setProgress(100);

    } catch (error) {
      console.error("Compression Error:", error);
      alert("something went wrong!!");
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 min-h-[calc(100vh-80px)] flex flex-col">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 uppercase transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-indigo-500" /> Compress PDF Pro
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        
        {/* State 1: Upload */}
        {!file && (
          <div className="w-full max-w-3xl bg-white border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all hover:border-indigo-400">
            {!isEngineReady ? (
              <div className="flex flex-col items-center justify-center p-20 z-10 bg-white/80 backdrop-blur-sm absolute inset-0">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h3 className="text-2xl font-black text-slate-800">Initializing Compression Engine...</h3>
              </div>
            ) : null}

            <div onClick={() => isEngineReady && fileInputRef.current?.click()} className={`p-20 flex flex-col items-center w-full ${!isEngineReady ? 'opacity-20 pointer-events-none' : 'cursor-pointer group'}`}>
              <div className="bg-indigo-100 p-8 rounded-full mb-6 group-hover:scale-110 group-hover:bg-indigo-200 transition-all duration-300 shadow-inner">
                <FileArchive className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Compress PDF Files</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Reduce file size while optimizing for maximal PDF quality. 100% Offline.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition shadow-xl pointer-events-none">
                Select Document
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        )}

        {/* State 2: Settings & Compression */}
        {file && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Card: File Info & Progress */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col">
               <div className="flex items-start gap-4 mb-8">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                   <FileText className="w-8 h-8" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <h3 className="font-black text-slate-800 text-lg truncate" title={file.name}>{file.name}</h3>
                   <p className="text-sm font-bold text-slate-400 mt-1">Original Size: <span className="text-slate-600">{originalSize}</span></p>
                 </div>
                 <button onClick={() => setFile(null)} disabled={isProcessing} className="text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">Change</button>
               </div>

               {isProcessing && (
                 <div className="mt-auto mb-4">
                   <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                     <span>Compressing Engine Active...</span>
                     <span>{progress}%</span>
                   </div>
                   <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                   </div>
                 </div>
               )}

               {isDone && newSize && (
                 <div className="mt-auto mb-4 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center">
                   <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                   <h4 className="font-black text-emerald-800 text-lg">Compression Successful!</h4>
                   <p className="font-bold text-emerald-600 mt-1">New Size: {newSize}</p>
                 </div>
               )}

               <button 
                  onClick={handleCompress} 
                  disabled={isProcessing} 
                  className={`w-full mt-auto py-4 rounded-xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-xl ${
                    isProcessing ? 'bg-slate-100 text-slate-400 shadow-none' : 
                    isDone ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-indigo-600 text-white hover:bg-slate-900 hover:-translate-y-1'
                  }`}
                >
                  {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Crunching PDF...</> : 
                   isDone ? <><Download className="w-5 h-5" /> Download Again</> : 'Compress PDF Now'}
               </button>
            </div>

            {/* Right Card: Settings */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative">
               
               {/* Disable overlay while processing */}
               {isProcessing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 rounded-3xl"></div>}

               <div className="flex items-center gap-3 mb-6">
                 <Settings2 className="w-6 h-6 text-slate-800" />
                 <h3 className="font-black text-slate-800 text-xl">Compression Level</h3>
               </div>

               <div className="flex flex-col gap-4">
                 
                 {/* Extreme */}
                 <label className={`relative flex items-center p-5 cursor-pointer rounded-2xl border-2 transition-all ${compressionLevel === 'extreme' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                   <input type="radio" name="compression" value="extreme" checked={compressionLevel === 'extreme'} onChange={() => setCompressionLevel('extreme')} className="hidden" />
                   <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${compressionLevel === 'extreme' ? 'border-indigo-600' : 'border-slate-300'}`}>
                     {compressionLevel === 'extreme' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                   </div>
                   <div className="flex-1">
                     <h4 className={`font-black ${compressionLevel === 'extreme' ? 'text-indigo-900' : 'text-slate-700'}`}>Extreme Compression</h4>
                     <p className="text-xs font-bold text-slate-500 mt-1">Lowest quality, smallest file size.</p>
                   </div>
                   <Percent className={`w-6 h-6 ${compressionLevel === 'extreme' ? 'text-indigo-500' : 'text-slate-300'}`} />
                 </label>

                 {/* Recommended */}
                 <label className={`relative flex items-center p-5 cursor-pointer rounded-2xl border-2 transition-all ${compressionLevel === 'recommended' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                   <input type="radio" name="compression" value="recommended" checked={compressionLevel === 'recommended'} onChange={() => setCompressionLevel('recommended')} className="hidden" />
                   <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${compressionLevel === 'recommended' ? 'border-emerald-500' : 'border-slate-300'}`}>
                     {compressionLevel === 'recommended' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>}
                   </div>
                   <div className="flex-1">
                     <h4 className={`font-black ${compressionLevel === 'recommended' ? 'text-emerald-900' : 'text-slate-700'}`}>Recommended</h4>
                     <p className="text-xs font-bold text-slate-500 mt-1">Good quality, good compression.</p>
                   </div>
                   {compressionLevel === 'recommended' && <span className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm uppercase">Best Choice</span>}
                 </label>

                 {/* Low */}
                 <label className={`relative flex items-center p-5 cursor-pointer rounded-2xl border-2 transition-all ${compressionLevel === 'low' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                   <input type="radio" name="compression" value="low" checked={compressionLevel === 'low'} onChange={() => setCompressionLevel('low')} className="hidden" />
                   <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${compressionLevel === 'low' ? 'border-indigo-600' : 'border-slate-300'}`}>
                     {compressionLevel === 'low' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                   </div>
                   <div className="flex-1">
                     <h4 className={`font-black ${compressionLevel === 'low' ? 'text-indigo-900' : 'text-slate-700'}`}>Less Compression</h4>
                     <p className="text-xs font-bold text-slate-500 mt-1">High quality, slightly smaller file size.</p>
                   </div>
                 </label>

               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}