'use client';

import React, { useState, useRef } from 'react';
import { Layers, Trash2, RotateCw, Loader2, Download, ArrowLeft, MoveRight } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, degrees } from 'pdf-lib';

interface PageItem {
  id: string;
  originalIndex: number;
  rotation: number;
}

export default function OrganizePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const count = pdf.getPageCount();
        
        const initialPages: PageItem[] = Array.from({ length: count }, (_, i) => ({
          id: `page-${Math.random().toString(36).substr(2, 9)}`,
          originalIndex: i,
          rotation: 0
        }));

        setFile(selectedFile);
        setPages(initialPages);
        setIsDone(false);
      } catch (error) {
        alert("Error loading your pdf!");
      }
    }
  };

  const rotatePage = (id: string) => {
    setPages(prev => prev.map(p => 
      p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
    ));
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return alert("atleast one page should be there!!");
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const movePage = (index: number, direction: 'up' | 'down') => {
    const newPages = [...pages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setPages(newPages);
  };

  const handleOrganize = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      const indicesToCopy = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy);

      copiedPages.forEach((page, index) => {
        const rotationAngle = pages[index].rotation;
        if (rotationAngle !== 0) {
          page.setRotation(degrees(rotationAngle));
        }
        newPdf.addPage(page);
      });

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_organized_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);
    } catch (error) {
      console.error("Organize error:", error);
      alert("Error please try again !");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-lime-700 hover:text-lime-800 mb-4 uppercase transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Organize PDF</h1>
        <p className="text-lg text-slate-600 font-medium max-w-xl mx-auto">
          Rearrange, rotate or delete pages. <span className="text-slate-800 font-black">Total control in your browser.</span>
        </p>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-white border-2 border-dashed border-lime-300 rounded-3xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-lime-50 transition-all min-h-[400px]"
        >
          <div className="bg-lime-200 p-6 rounded-full mb-6">
            <Layers className="w-10 h-10 text-lime-800" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Upload PDF to Organize</h3>
          <p className="text-slate-600 font-bold mb-6">Manage pages of any document locally</p>
          <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-lime-700 transition shadow-lg pointer-events-none">
            Select File
          </button>
          <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl flex items-center justify-between sticky top-24 z-30 shadow-md">
            <div className="flex items-center gap-4">
              <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                {pages.length} Pages
              </span>
              <p className="text-sm font-black text-slate-700 truncate max-w-[200px]">{file.name}</p>
            </div>
            <div className="flex gap-3">
               <button onClick={() => setFile(null)} className="px-4 py-2 text-sm font-black text-slate-500 hover:text-red-600 transition-colors">Discard</button>
               <button 
                onClick={handleOrganize} 
                disabled={isProcessing}
                className="bg-lime-600 text-white px-6 py-2 rounded-xl font-black hover:bg-slate-900 transition flex items-center gap-2 shadow-lg"
               >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Save & Download
               </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {pages.map((page, index) => (
              <div 
                key={page.id} 
                className="group bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-400 hover:shadow-xl transition-all relative flex flex-col items-center"
              >
                <div className="absolute -top-3 -left-3 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black z-10 shadow-lg border-2 border-white">
                  {index + 1}
                </div>

                <div 
                  className="w-full aspect-[3/4] bg-slate-100 border-2 border-slate-200 rounded-lg mb-4 flex flex-col items-center justify-center relative overflow-hidden transition-transform duration-300 shadow-inner"
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                >
                  {/* Made the file icon much darker and bolder */}
                  <FileText className="w-14 h-14 text-slate-400 mb-2" />
                  <span className="text-[11px] font-black text-slate-500 uppercase bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200">Page {page.originalIndex + 1}</span>
                </div>

                <div className="flex items-center justify-between w-full border-t-2 border-slate-100 pt-3">
                  <div className="flex gap-2">
                    {/* Darker navigation icons */}
                    <button onClick={() => movePage(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 disabled:opacity-30 transition-colors"><MoveRight className="w-5 h-5 -rotate-180" /></button>
                    <button onClick={() => movePage(index, 'down')} disabled={index === pages.length - 1} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 disabled:opacity-30 transition-colors"><MoveRight className="w-5 h-5" /></button>
                  </div>
                  <div className="flex gap-2">
                    {/* Darker action icons */}
                    <button onClick={() => rotatePage(page.id)} className="p-1.5 hover:bg-lime-100 hover:text-lime-700 rounded-lg text-slate-700 transition-colors"><RotateCw className="w-5 h-5" /></button>
                    <button onClick={() => deletePage(page.id)} className="p-1.5 hover:bg-red-100 hover:text-red-700 rounded-lg text-slate-700 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FileText({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
  );
}