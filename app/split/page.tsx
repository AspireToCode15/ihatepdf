'use client';

import React, { useState, useRef } from 'react';
import { Scissors, FileText, Trash2, Loader2, Download, ArrowLeft, Layers } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

export default function SplitPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload hote hi page count check karenge
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const count = pdf.getPageCount();
        
        setFile(selectedFile);
        setPageCount(count);
        setEndPage(count); // Default end page last page hoga
      } catch (error) {
        alert("Error loading PDF!");
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setPageCount(0);
  };

  // 🔥 THE REAL ENGINE: Extracts specific pages locally
  const handleSplit = async () => {
    if (!file) return;
    if (startPage < 1 || endPage > pageCount || startPage > endPage) {
      return alert("Invalid page range!");
    }

    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      // Pages are 0-indexed in pdf-lib, so we subtract 1
      const indicesToExtract = [];
      for (let i = startPage - 1; i < endPage; i++) {
        indicesToExtract.push(i);
      }

      // Selected pages ko naye PDF mein copy karo
      const copiedPages = await newPdf.copyPages(pdf, indicesToExtract);
      copiedPages.forEach((page) => newPdf.addPage(page));

      // Save and Download
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_split_p${startPage}-p${endPage}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsProcessing(false);
    } catch (error) {
      console.error("Split error:", error);
      alert("Error splitting your PDF!");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-orange-500 hover:text-orange-600 mb-4 tracking-wide uppercase transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Split PDF</h1>
        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
          Extract specific pages from your PDF instantly. <span className="text-slate-700 font-bold">Safe & Private.</span>
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-orange-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-orange-50 hover:border-orange-400 transition-all min-h-[300px]"
          >
            <div className="bg-orange-100 p-6 rounded-full mb-6">
              <Scissors className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload PDF to Split</h3>
            <p className="text-slate-500 font-medium mb-6">Extract pages from any document</p>
            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg pointer-events-none">
              Select File
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* File Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><FileText /></div>
                <div>
                  <p className="font-bold text-slate-800 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{pageCount} Pages Found</p>
                </div>
              </div>
              <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors p-2"><Trash2 /></button>
            </div>

            {/* Split Settings */}
            <div className="grid grid-cols-2 gap-6 bg-orange-50/50 p-8 rounded-2xl border border-orange-100">
              <div className="space-y-2">
                <label className="text-xs font-black text-orange-600 uppercase tracking-widest">Start Page</label>
                <input 
                  type="number" 
                  min="1" 
                  max={pageCount} 
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value))}
                  className="w-full p-4 bg-white border border-orange-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-orange-600 uppercase tracking-widest">End Page</label>
                <input 
                  type="number" 
                  min="1" 
                  max={pageCount} 
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value))}
                  className="w-full p-4 bg-white border border-orange-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleSplit}
                disabled={isProcessing}
                className="bg-orange-600 text-white px-12 py-5 rounded-2xl font-black text-xl flex items-center gap-3 hover:bg-slate-900 hover:shadow-2xl hover:shadow-orange-200 transition-all hover:-translate-y-1"
              >
                {isProcessing ? <><Loader2 className="animate-spin" /> Splitting...</> : <><Layers className="w-6 h-6" /> Extract These Pages</>}
              </button>
            </div>
          </div>
        )}
        <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      </div>
    </div>
  );
}