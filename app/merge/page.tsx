'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Loader2, Download, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

export default function MergePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
      if (selectedFiles.length === 0) return alert("Only pdfs are allowed!");
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  // Remove individual file
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // 🔥 THE REAL ENGINE: 100% Local Merge using pdf-lib
  const handleMerge = async () => {
    if (files.length < 2) return alert("Select atleast two pdfs to merge!");
    
    setIsProcessing(true);
    
    try {
      // Create a new empty PDF
      const mergedPdf = await PDFDocument.create();

      // Loop through all uploaded files
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // Save and trigger download
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_merged_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsProcessing(false);
    } catch (error) {
      console.error("Merge error:", error);
      alert("Error merging your files please try again!");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 mb-4 tracking-wide uppercase transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Merge PDF</h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          Combine multiple PDFs into a single document instantly. <span className="text-slate-700 font-bold">100% secure and local.</span>
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm min-h-[400px] flex flex-col">
        {files.length === 0 ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border-2 border-dashed border-red-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-red-50 hover:border-red-400 transition-all duration-300"
          >
            <div className="bg-red-100 p-6 rounded-full mb-6">
              <UploadCloud className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload PDFs to Merge</h3>
            <p className="text-slate-500 font-medium mb-6">Drag & drop your files here</p>
            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-lg pointer-events-none">
              Select Files
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {files.map((file, index) => (
                <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center relative group">
                  <button 
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 p-1.5 rounded-full shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <FileText className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-xs font-bold text-slate-700 text-center w-full truncate px-2">{file.name}</p>
                </div>
              ))}
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border-2 border-dashed border-red-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-red-50 transition-colors min-h-[120px]"
              >
                <Plus className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-xs font-bold text-red-500 text-center">Add More</p>
              </div>
            </div>
            
            <div className="mt-auto flex justify-center">
              <button 
                onClick={handleMerge}
                disabled={files.length < 2 || isProcessing}
                className={`px-12 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
                  files.length < 2 
                    ? 'bg-slate-100 text-slate-400 shadow-none' 
                    : 'bg-red-600 text-white hover:bg-slate-900 hover:-translate-y-1'
                }`}
              >
                {isProcessing ? <><Loader2 className="w-6 h-6 animate-spin" /> Merging...</> : 'Merge PDFs Now'}
              </button>
            </div>
          </div>
        )}
        <input type="file" accept="application/pdf" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      </div>
    </div>
  );
}