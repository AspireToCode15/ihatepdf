'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Download, ArrowLeft, CheckCircle, FileUp, TableProperties, Info } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx'; // The new Excel Engine

export default function PDFToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [excelData, setExcelData] = useState<any[][]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. PDF ENGINE LOADER
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

  // 2. THE ROW & COLUMN SNIFFER (PDF to 2D Array)
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
        let finalExcelArray: any[][] = [];
        let totalItems = 0;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          totalItems += textContent.items.length;
          
          // Sort items top-to-bottom (Y), then left-to-right (X)
          const items = textContent.items.sort((a: any, b: any) => {
            // If Y coordinates are significantly different, sort by Y
            if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
                return b.transform[5] - a.transform[5]; 
            }
            // If they are on the same line, sort by X
            return a.transform[4] - b.transform[4];
          });

          let currentRowY = -1;
          let currentRow: string[] = [];

          items.forEach((item: any) => {
            const y = item.transform[5];
            const text = item.str.trim();

            if (!text) return; // Skip empty strings

            // Tolerance of 5 points for "Same Row" alignment
            if (currentRowY === -1 || Math.abs(currentRowY - y) > 5) {
              // Push the completed row and start a new one
              if (currentRow.length > 0) finalExcelArray.push(currentRow);
              currentRow = [text];
              currentRowY = y;
            } else {
              // Same row, add as a new column/cell
              currentRow.push(text);
            }
          });

          // Push the very last row of the page
          if (currentRow.length > 0) finalExcelArray.push(currentRow);
          
          // Add an empty row to separate pages visually in Excel
          finalExcelArray.push([]); 
        }

        if (totalItems === 0) {
           alert("CRITICAL ERROR: this pdf seems to have scanned images only real text/table pdf are supported!!.");
           setFile(null);
           setIsProcessing(false);
           return;
        }
        
        setExcelData(finalExcelArray);
        setIsProcessing(false);
        
      } catch (error) {
        console.error("Extraction Error:", error);
        alert("error reading your pdf!");
        setIsProcessing(false);
      }
    }
  };

  // 3. THE EXCEL BAKER (2D Array to .xlsx file)
  const handleConvert = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      // Create a new Excel Workbook
      const wb = XLSX.utils.book_new();
      
      // Convert our 2D Array into an Excel Worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Append Worksheet to Workbook
      XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
      
      // Generate standard Excel filename
      const safeFilename = file?.name ? file.name.replace('.pdf', '') : 'document';
      
      // Download the file!
      XLSX.writeFile(wb, `ihatepdf_converted_${safeFilename}.xlsx`);
      
      setIsDone(true);
      setIsProcessing(false);
    }, 800); 
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 min-h-[calc(100vh-80px)] flex flex-col bg-slate-50">
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 uppercase transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-emerald-600" /> PDF to Excel <span className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-md uppercase font-black tracking-widest">Beta Engine</span>
          </h1>
        </div>
      </div>

      {/* 🚀 THE FOUNDER's DISCLAIMER NOTE */}
      <div className="mb-8 bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
         <div className="p-2 bg-amber-100 rounded-full shrink-0">
           <Info className="w-6 h-6 text-amber-600" />
         </div>
         <div>
            <h3 className="font-black text-amber-900 text-lg mb-1">Developer Note: 100% Offline Spreadsheet Engine</h3>
            <p className="text-amber-800 text-sm font-medium leading-relaxed mb-2">
              <b>ihatepdf</b> converts your PDF tables into editable Excel (XLSX) sheets directly within your browser. Zero cloud uploads, zero wait time, maximum data privacy.
            </p>
            <p className="text-amber-800 text-sm font-bold opacity-80">
              💡 For Best Results: This tool groups text into rows/columns based on alignment. It works incredibly well for structured data, lists, and clean tables. Complex or nested tables may need a quick manual tidy-up in Excel.
            </p>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-10">
        
        {/* State 1: Upload */}
        {!file && (
          <div className="w-full max-w-3xl bg-white border-2 border-dashed border-emerald-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all hover:border-emerald-400">
            
            {!isEngineReady && (
              <div className="flex flex-col items-center justify-center p-20 z-10 bg-white/80 backdrop-blur-sm absolute inset-0">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                <h3 className="text-2xl font-black text-slate-800">Initializing Table Extractor...</h3>
              </div>
            )}

            <div onClick={() => isEngineReady && fileInputRef.current?.click()} className={`p-16 flex flex-col items-center w-full ${!isEngineReady ? 'opacity-20 pointer-events-none' : 'cursor-pointer group'}`}>
              <div className="bg-emerald-50 p-8 rounded-full mb-6 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300 shadow-inner">
                <FileUp className="w-16 h-16 text-emerald-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Convert PDF to Excel</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Pull data, lists, and tables straight out of your PDF and into an editable XLSX file.</p>
              <button className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-900 transition shadow-xl pointer-events-none">
                Select PDF File
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        )}

        {/* State 2: Conversion Success / Trigger */}
        {file && !isProcessing && excelData.length > 0 && (
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-10 shadow-sm flex flex-col items-center text-center transition-all animate-in zoom-in-95 duration-300">
            
            {isDone ? (
              <>
                <div className="p-6 bg-emerald-50 rounded-full mb-6 border-4 border-emerald-100">
                  <CheckCircle className="w-16 h-16 text-emerald-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-3">Spreadsheet Ready!</h3>
                <p className="text-slate-500 font-medium mb-8">Data successfully mapped to columns and rows.</p>
              </>
            ) : (
              <>
                <div className="p-6 bg-indigo-50 rounded-full mb-6 border-4 border-indigo-100">
                  <TableProperties className="w-16 h-16 text-indigo-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-3">Data Extracted</h3>
                <p className="text-slate-500 font-medium mb-8"><b>{file.name}</b> has been scanned. Found {excelData.length} rows of potential data.</p>
              </>
            )}

            <div className="flex gap-4 w-full">
               <button onClick={() => { setFile(null); setExcelData([]); setIsDone(false); }} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                 Convert Another
               </button>
               
               {!isDone && (
                 <button onClick={handleConvert} className="flex-1 py-4 font-black text-white bg-emerald-600 hover:bg-slate-900 shadow-xl shadow-emerald-200 rounded-xl transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
                   <Download className="w-5 h-5" /> Download XLSX
                 </button>
               )}
            </div>
          </div>
        )}

        {/* Processing Spinner */}
        {isProcessing && (
           <div className="flex flex-col items-center mt-10">
             <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
             <h3 className="text-2xl font-black text-slate-800">Baking Spreadsheet...</h3>
             <p className="text-slate-500 mt-2">Aligning rows and columns offline...</p>
           </div>
        )}

      </div>
    </div>
  );
}