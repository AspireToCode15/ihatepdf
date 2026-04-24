'use client';

import React, { useState, useRef } from 'react';
import { FileImage, FileText, Trash2, Loader2, Download, ArrowLeft, Type, Sliders, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);
  const [fontSize, setFontSize] = useState(60);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      setFile(selectedFile);
      setIsDone(false);
    }
  };

  // 🔥 THE REAL ENGINE: Stamps watermark on every page locally
  const handleWatermark = async () => {
    if (!file || !watermarkText.trim()) return;

    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        
        page.drawText(watermarkText, {
          x: width / 4,
          y: height / 2,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
          opacity: opacity,
          rotate: degrees(rotation),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_watermarked_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);
    } catch (error) {
      console.error("Watermark error:", error);
      alert("Error adding watermark to your PDF!");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 mb-4 tracking-wide uppercase transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Add Watermark</h1>
        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
          Stamp text over your PDF pages. <span className="text-slate-700 font-bold">100% Private & Local.</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border-2 border-dashed border-amber-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm min-h-[400px]"
            >
              <div className="bg-amber-100 p-6 rounded-full mb-6">
                <FileImage className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload PDF</h3>
              <p className="text-slate-500 font-medium">Select a document to watermark</p>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm h-full relative overflow-hidden">
               {/* Preview Mockup */}
               <div className="w-64 h-80 bg-slate-50 border border-slate-200 rounded-lg shadow-inner relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 p-4 space-y-2 opacity-20">
                    <div className="h-2 bg-slate-300 rounded w-full"></div>
                    <div className="h-2 bg-slate-300 rounded w-5/6"></div>
                    <div className="h-2 bg-slate-300 rounded w-full"></div>
                  </div>
                  <p 
                    className="font-black text-slate-400 select-none transition-all pointer-events-none"
                    style={{ 
                      fontSize: `${fontSize/2}px`, 
                      opacity: opacity, 
                      transform: `rotate(${rotation}deg)` 
                    }}
                  >
                    {watermarkText}
                  </p>
               </div>
               <p className="mt-6 font-bold text-slate-400 text-sm">{file.name}</p>
               <button onClick={() => setFile(null)} className="mt-4 text-xs font-bold text-red-500 hover:underline">Change File</button>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm">
           <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-amber-600" />
            <h3 className="text-xl font-black text-slate-800">Settings</h3>
          </div>

          <div className="space-y-6 flex-1">
             <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Watermark Text</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
             </div>

             <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Opacity ({Math.round(opacity * 100)}%)</label>
                <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-amber-500" />
             </div>

             <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Rotation ({rotation}°)</label>
                <input type="range" min="-180" max="180" step="5" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="w-full accent-amber-500" />
             </div>

             <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Font Size ({fontSize}px)</label>
                <input type="range" min="10" max="150" step="5" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-amber-500" />
             </div>
          </div>

          <button 
            onClick={handleWatermark}
            disabled={!file || isProcessing}
            className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all mt-8 ${
              !file ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-amber-600 text-white hover:bg-slate-900 shadow-xl'
            }`}
          >
            {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : isDone ? <><CheckCircle className="w-5 h-5" /> Done!</> : <><Download className="w-5 h-5" /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}