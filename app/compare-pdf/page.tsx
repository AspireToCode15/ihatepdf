'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Scale, CheckCircle, FileUp, Info, FileText, AlertCircle, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import * as Diff from 'diff';

export default function ComparePDFPage() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [diffResult, setDiffResult] = useState<Diff.Change[] | null>(null);
  const [stats, setStats] = useState({ additions: 0, deletions: 0 });
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  const file1InputRef = useRef<HTMLInputElement>(null);
  const file2InputRef = useRef<HTMLInputElement>(null);

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

  const handleFile1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].type !== 'application/pdf') return alert("Only pdfs are allowed!");
      setFile1(e.target.files[0]);
      setDiffResult(null);
    }
  };

  const handleFile2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].type !== 'application/pdf') return alert("Only pdfs are allowed!");
      setFile2(e.target.files[0]);
      setDiffResult(null);
    }
  };

  const extractTextFromPDF = async (file: File) => {
    const pdfjsLib = (window as any).pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + ' \n';
    }
    
    // Normalize spaces for better diffing
    return fullText.replace(/\s+/g, ' ').trim();
  };

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    setIsProcessing(true);

    try {
      // Extract text locally from both files
      const text1 = await extractTextFromPDF(file1);
      const text2 = await extractTextFromPDF(file2);

      if (!text1 || !text2) {
         alert("cannot process this pdf upload another this pdf seems corrupt.");
         setIsProcessing(false);
         return;
      }

      // 🚀 THE OFFLINE DIFF ALGORITHM
      // Compares word by word to find what changed
      const differences = Diff.diffWords(text1, text2);
      
      let adds = 0;
      let dels = 0;
      
      differences.forEach(part => {
        if (part.added) adds++;
        if (part.removed) dels++;
      });

      setStats({ additions: adds, deletions: dels });
      setDiffResult(differences);
      setIsProcessing(false);

    } catch (error) {
      console.error("Comparison Error:", error);
      alert("Something went wrong.");
      setIsProcessing(false);
    }
  };

  const resetComparison = () => {
      setFile1(null);
      setFile2(null);
      setDiffResult(null);
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
            <Scale className="w-6 h-6 text-amber-500" /> Compare PDFs
          </h1>
        </div>
      </div>

      {!diffResult && !isProcessing && (
        <>
          <div className="mb-10 bg-amber-50 border border-amber-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
             <div className="p-4 bg-amber-100 rounded-2xl shrink-0">
               <ArrowRightLeft className="w-8 h-8 text-amber-600" />
             </div>
             <div>
                <h3 className="font-black text-amber-900 text-xl mb-2">Spot the Hidden Changes</h3>
                <p className="text-amber-800 text-sm font-medium leading-relaxed mb-4">
                  Did someone send you an "updated" contract or assignment? Don't read the whole thing again. Upload the Original and the Modified PDF below. We will highlight exactly which words were added and which were deleted.
                </p>
                <p className="text-amber-800 text-sm font-bold">
                  💡 100% Offline. Your sensitive contracts never touch our servers.
                </p>
             </div>
          </div>

          {/* TWO FILE UPLOADS SIDE BY SIDE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* File 1: Original */}
            <div 
              onClick={() => isEngineReady && file1InputRef.current?.click()} 
              className={`bg-white border-2 border-dashed ${file1 ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-amber-300'} rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group h-80 ${!isEngineReady && 'opacity-50'}`}
            >
               {file1 ? (
                 <>
                   <div className="p-4 bg-slate-800 rounded-2xl mb-4">
                     <FileText className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="font-black text-slate-800 text-lg mb-1 truncate w-full px-4" title={file1.name}>{file1.name}</h3>
                   <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider">Original Uploaded</span>
                 </>
               ) : (
                 <>
                   <div className="bg-amber-50 p-6 rounded-3xl mb-6 group-hover:scale-110 transition-all duration-300 shadow-inner border border-amber-100">
                     <FileUp className="w-10 h-10 text-amber-500" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-800 mb-2">Upload Original</h3>
                   <p className="text-sm text-slate-500 font-medium">The older version of your document.</p>
                 </>
               )}
               <input type="file" accept="application/pdf" className="hidden" ref={file1InputRef} onChange={handleFile1Change} />
            </div>

            {/* File 2: Modified */}
            <div 
              onClick={() => isEngineReady && file2InputRef.current?.click()} 
              className={`bg-white border-2 border-dashed ${file2 ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'} rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group h-80 ${!isEngineReady && 'opacity-50'}`}
            >
               {file2 ? (
                 <>
                   <div className="p-4 bg-amber-500 rounded-2xl mb-4 shadow-lg shadow-amber-200">
                     <FileText className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="font-black text-amber-900 text-lg mb-1 truncate w-full px-4" title={file2.name}>{file2.name}</h3>
                   <span className="text-xs font-bold bg-amber-200 text-amber-800 px-3 py-1 rounded-full uppercase tracking-wider">Modified Uploaded</span>
                 </>
               ) : (
                 <>
                   <div className="bg-slate-50 p-6 rounded-3xl mb-6 group-hover:scale-110 transition-all duration-300 shadow-inner border border-slate-100">
                     <FileUp className="w-10 h-10 text-slate-400" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-800 mb-2">Upload Modified</h3>
                   <p className="text-sm text-slate-500 font-medium">The newer version to compare against.</p>
                 </>
               )}
               <input type="file" accept="application/pdf" className="hidden" ref={file2InputRef} onChange={handleFile2Change} />
            </div>

          </div>

          <div className="flex justify-center">
            <button 
              disabled={!file1 || !file2 || !isEngineReady}
              onClick={handleCompare} 
              className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-amber-500 transition-all shadow-xl disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center gap-3"
            >
              <Scale className="w-6 h-6" /> Compare Documents
            </button>
          </div>
        </>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <Loader2 className="w-16 h-16 text-amber-500 animate-spin mb-6" />
           <h3 className="text-2xl font-black text-slate-800">Reading & Diffing...</h3>
           <p className="text-slate-500 mt-2 font-medium">Comparing thousands of words locally...</p>
         </div>
      )}

      {/* 🟢 THE DIFF RESULT UI */}
      {diffResult && !isProcessing && (
        <div className="flex-1 flex flex-col w-full animate-in fade-in slide-in-from-bottom-10 duration-500">
          
          <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
             <div>
               <h2 className="text-xl font-black text-slate-800">Comparison Results</h2>
               <p className="text-sm text-slate-500 font-medium mt-1">Review the exact changes made to the document.</p>
             </div>
             
             <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 px-3">
                   <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-200"></div>
                   <span className="text-sm font-bold text-slate-700">{stats.additions} Additions</span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex items-center gap-2 px-3">
                   <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm shadow-red-200"></div>
                   <span className="text-sm font-bold text-slate-700">{stats.deletions} Deletions</span>
                </div>
             </div>

             <button onClick={resetComparison} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
               Compare New Files
             </button>
          </div>

          {/* THE HIGHLIGHTED TEXT VIEWER */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 md:p-12 shadow-inner overflow-y-auto max-h-[70vh] text-left leading-relaxed font-medium text-slate-700 whitespace-pre-wrap font-sans">
             {diffResult.length === 1 && !diffResult[0].added && !diffResult[0].removed ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                  <h3 className="text-2xl font-black text-slate-800">100% Identical</h3>
                  <p className="text-slate-500 font-medium mt-2">No changes were found between the two documents.</p>
                </div>
             ) : (
                diffResult.map((part, index) => {
                  if (part.added) {
                    return (
                      <span key={index} className="bg-emerald-100 text-emerald-900 border-b-2 border-emerald-400 font-bold px-1 rounded-sm mx-0.5" title="Added Text">
                        {part.value}
                      </span>
                    );
                  }
                  if (part.removed) {
                    return (
                      <span key={index} className="bg-red-100 text-red-900 line-through opacity-70 font-bold px-1 rounded-sm mx-0.5" title="Deleted Text">
                        {part.value}
                      </span>
                    );
                  }
                  return <span key={index} className="text-slate-600">{part.value}</span>;
                })
             )}
          </div>

        </div>
      )}

    </div>
  );
}