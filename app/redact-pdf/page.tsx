'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Eraser, CheckCircle, FileUp, Download, Info, MousePointerSquareDashed, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';

export default function RedactPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  // Interactive Editor States
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rectangles, setRectangles] = useState<Record<number, {x: number, y: number, w: number, h: number}[]>>({});
  
  // 🚀 DUAL CANVAS SYSTEM (For buttery smooth drawing)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null); // Renders PDF
  const fgCanvasRef = useRef<HTMLCanvasElement>(null); // Renders Drawing Box
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load pdf.js engine
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
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      setFile(selectedFile);
      setIsDone(false);
      setRectangles({});
      setCurrentPage(1);

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setNumPages(loadedPdf.numPages);
    }
  };

  // 🚀 ONLY RENDER PDF WHEN PAGE CHANGES (Fixed the dancing issue!)
  useEffect(() => {
    if (pdfDoc && bgCanvasRef.current && fgCanvasRef.current) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, rectangles]); // Removed currentRect from dependencies

  const renderPage = async (pageNum: number) => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;
    
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    bgCanvas.height = viewport.height;
    bgCanvas.width = viewport.width;
    fgCanvas.height = viewport.height;
    fgCanvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // Draw saved rectangles
    const pageRects = rectangles[pageNum] || [];
    ctx.fillStyle = 'black';
    pageRects.forEach(rect => {
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
  };

  // --- SMOOTH DRAWING LOGIC ON FOREGROUND CANVAS ---
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setStartPos(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    const newRect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y)
    };
    
    setCurrentRect(newRect);

    // Draw directly to the top glass layer (instant speed)
    const fgCanvas = fgCanvasRef.current;
    if (!fgCanvas) return;
    const ctx = fgCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(newRect.x, newRect.y, newRect.w, newRect.h);
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect) {
      setRectangles(prev => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), currentRect]
      }));
    }
    
    setIsDrawing(false);
    setCurrentRect(null);

    // Clear top glass layer
    const fgCanvas = fgCanvasRef.current;
    if (fgCanvas) {
       const ctx = fgCanvas.getContext('2d');
       ctx?.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
    }
  };

  const undoLastRedaction = () => {
    setRectangles(prev => {
      const pageRects = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: pageRects.slice(0, -1)
      };
    });
  };

  // --- THE FINAL BAKE ---
  const handleRedactAndSave = async () => {
    if (!file || !pdfDoc) return;
    setIsProcessing(true);

    let newPdf: jsPDF | null = null;

    try {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2 }); 
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const scaleRatio = 2 / 1.5; 
        const pageRects = rectangles[i] || [];
        ctx.fillStyle = 'black';
        pageRects.forEach(rect => {
          ctx.fillRect(rect.x * scaleRatio, rect.y * scaleRatio, rect.w * scaleRatio, rect.h * scaleRatio);
        });

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';

        if (i === 1) {
          newPdf = new jsPDF({ orientation: orientation, unit: 'px', format: [viewport.width, viewport.height] });
        } else if (newPdf) {
          newPdf.addPage([viewport.width, viewport.height], orientation);
        }

        if (newPdf) {
          newPdf.addImage(imgDataUrl, 'JPEG', 0, 0, viewport.width, viewport.height);
        }
      }

      if (newPdf) {
        newPdf.save(`ihatepdf_redacted_${file.name}`);
      }

      setIsDone(true);
      setIsProcessing(false);

    } catch (error) {
      console.error("Redaction Error:", error);
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
            <Eraser className="w-6 h-6 text-stone-800" /> Redact PDF
          </h1>
        </div>
      </div>

      {!file && (
        <>
          <div className="mb-10 bg-stone-100 border border-stone-200 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all">
             <div className="p-4 bg-stone-200 rounded-2xl shrink-0">
               <MousePointerSquareDashed className="w-8 h-8 text-stone-700" />
             </div>
             <div>
                <h3 className="font-black text-stone-900 text-xl mb-2">Permanently Censor Sensitive Info</h3>
                <p className="text-stone-700 text-sm font-medium leading-relaxed mb-4">
                  Simply placing a black box over text in Word or normal PDF editors isn't safe. The text can still be copied! 
                </p>
                <p className="text-stone-800 text-sm font-bold">
                  Our tool lets you draw black boxes and then "bakes" the document into a flat image. The text underneath is permanently destroyed. 100% Hacker-proof.
                </p>
             </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pb-10">
            <div 
              onClick={() => isEngineReady && fileInputRef.current?.click()} 
              className={`w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 hover:border-stone-400 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
            >
              <div className="bg-stone-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-stone-100 transition-all duration-300 shadow-inner">
                <Eraser className="w-16 h-16 text-stone-800" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Blackout PDF Text</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Upload a document to visually draw blackout boxes over sensitive information.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-stone-700 transition shadow-xl pointer-events-none">
                Select PDF File
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        </>
      )}

      {/* THE INTERACTIVE EDITOR */}
      {file && !isProcessing && !isDone && (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Panel: Viewer & Canvas */}
          <div className="flex-1 bg-slate-200 p-4 rounded-[2rem] border border-slate-300 shadow-inner flex flex-col items-center justify-start overflow-hidden min-h-[600px]">
             {pdfDoc ? (
               <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white cursor-crosshair select-none">
                 
                 {/* BOTTOM LAYER (PDF + SAVED RECTS) */}
                 <canvas ref={bgCanvasRef} className="max-w-full h-auto block" />
                 
                 {/* TOP LAYER (FAST DRAWING) */}
                 <canvas 
                    ref={fgCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="absolute inset-0 w-full h-full block touch-none"
                 />
                 
               </div>
             ) : (
               <Loader2 className="w-10 h-10 animate-spin text-slate-500 mt-20" />
             )}
          </div>

          {/* Right Panel: Controls */}
          <div className="w-full lg:w-80 bg-white rounded-[2rem] border border-slate-200 p-6 shadow-xl flex flex-col shrink-0 h-fit sticky top-24">
            <h3 className="font-black text-slate-800 text-lg mb-1 truncate" title={file.name}>{file.name}</h3>
            <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-6">Redaction Editor</p>

            <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl mb-6">
              <p className="text-sm font-medium text-stone-700 leading-relaxed">
                <span className="font-bold text-stone-900">How to use:</span> Click and drag your mouse over the document to draw permanent black boxes.
              </p>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl mb-4">
              <button 
                disabled={currentPage <= 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>
              <span className="font-bold text-slate-700 text-sm">
                Page {currentPage} of {numPages}
              </span>
              <button 
                disabled={currentPage >= numPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <button onClick={undoLastRedaction} className="w-full py-3 font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all mb-6">
              Undo Last Box (This Page)
            </button>

            <div className="h-px bg-slate-100 w-full mb-6"></div>

            <button onClick={handleRedactAndSave} className="w-full py-4 font-black text-white bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200 rounded-2xl transition-all flex justify-center items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5" /> Save & Redact
            </button>
            <button onClick={() => {setFile(null); setPdfDoc(null)}} className="w-full py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
          </div>

        </div>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <Loader2 className="w-16 h-16 text-stone-800 animate-spin mb-6" />
           <h3 className="text-2xl font-black text-slate-800">Flattening & Securing...</h3>
           <p className="text-slate-500 mt-2 font-medium">Permanently baking black boxes into the document...</p>
         </div>
      )}

      {isDone && (
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
             <div className="p-6 bg-stone-100 rounded-full mb-6 border-4 border-stone-200">
               <ShieldCheck className="w-16 h-16 text-stone-800" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-3">Secured! ⬛</h3>
             <p className="text-slate-500 font-medium mb-8">The text underneath the black boxes is permanently destroyed.</p>
             
             <button onClick={() => { setFile(null); setIsDone(false); setPdfDoc(null); }} className="w-full py-4 font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-2xl transition-all">
               Redact Another File
             </button>
          </div>
        </div>
      )}

    </div>
  );
}