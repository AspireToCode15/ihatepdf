'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Crop, CheckCircle, FileUp, Info, Scissors, MousePointerSquareDashed } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

export default function CropPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  // PDF Viewer States
  const [pdfjsDoc, setPdfjsDoc] = useState<any>(null);
  const [pageViewport, setPageViewport] = useState<any>(null);
  
  // Dual Canvas System for lag-free drawing
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // 🚀 ADVANCED CROP BOX STATES
  const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  
  // Fast Refs for Zero-Lag dragging
  const actionRef = useRef<'draw' | 'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startRectRef = useRef<{x: number, y: number, w: number, h: number} | null>(null);
  const currentRectRef = useRef<{x: number, y: number, w: number, h: number} | null>(null);

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
      setCropRect(null);
      currentRectRef.current = null;

      // Render first page for preview
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfjsDoc(loadedPdf);
      renderPreviewPage(loadedPdf, 1);
    }
  };

  const drawOverlay = (rect: {x: number, y: number, w: number, h: number} | null) => {
      const fgCanvas = fgCanvasRef.current;
      if (!fgCanvas) return;
      const ctx = fgCanvas.getContext('2d');
      if (!ctx) return;

      // Darken whole area
      ctx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, fgCanvas.width, fgCanvas.height);

      if (!rect || rect.w === 0 || rect.h === 0) return;

      // Normalize rect (prevents negative width/height bugs)
      const norm = {
          x: rect.w < 0 ? rect.x + rect.w : rect.x,
          y: rect.h < 0 ? rect.y + rect.h : rect.y,
          w: Math.abs(rect.w),
          h: Math.abs(rect.h)
      };

      // Punch hole
      ctx.clearRect(norm.x, norm.y, norm.w, norm.h);
      
      // Draw Border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(norm.x, norm.y, norm.w, norm.h);

      // Draw 4 Corner Handles
      ctx.setLineDash([]);
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#2563eb';
      const hs = 10; // Handle size
      const drawHandle = (hx: number, hy: number) => {
          ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
          ctx.strokeRect(hx - hs/2, hy - hs/2, hs, hs);
      };

      drawHandle(norm.x, norm.y); // Top-Left (nw)
      drawHandle(norm.x + norm.w, norm.y); // Top-Right (ne)
      drawHandle(norm.x, norm.y + norm.h); // Bottom-Left (sw)
      drawHandle(norm.x + norm.w, norm.y + norm.h); // Bottom-Right (se)
  };

  const renderPreviewPage = async (pdfDoc: any, pageNum: number) => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 }); 
    setPageViewport(viewport);
    
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
    drawOverlay(null);
  };

  // --- 🔥 THE SMART DRAG & RESIZE ENGINE ---
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
    startPosRef.current = pos;

    if (cropRect) {
        const r = cropRect;
        const hs = 14; // Handle Hitbox size (slightly larger for easier clicking)
        const checkHandle = (hx: number, hy: number) => Math.abs(pos.x - hx) <= hs && Math.abs(pos.y - hy) <= hs;

        // Check if clicked on corners
        if (checkHandle(r.x, r.y)) actionRef.current = 'nw';
        else if (checkHandle(r.x + r.w, r.y)) actionRef.current = 'ne';
        else if (checkHandle(r.x, r.y + r.h)) actionRef.current = 'sw';
        else if (checkHandle(r.x + r.w, r.y + r.h)) actionRef.current = 'se';
        // Check if clicked inside box (Move)
        else if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) actionRef.current = 'move';
        // Otherwise, draw new box
        else actionRef.current = 'draw';
    } else {
        actionRef.current = 'draw';
    }

    if (actionRef.current === 'draw') {
        startRectRef.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
    } else {
        startRectRef.current = { ...cropRect! };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!actionRef.current || !startRectRef.current) return;
    
    const pos = getMousePos(e);
    const dx = pos.x - startPosRef.current.x;
    const dy = pos.y - startPosRef.current.y;
    const sr = startRectRef.current;

    let newRect = { ...sr };

    // Math for Dragging and Resizing
    if (actionRef.current === 'draw') {
        newRect.w = pos.x - sr.x;
        newRect.h = pos.y - sr.y;
    } else if (actionRef.current === 'move') {
        newRect.x = sr.x + dx;
        newRect.y = sr.y + dy;
    } else if (actionRef.current === 'nw') {
        newRect.x = sr.x + dx; newRect.y = sr.y + dy;
        newRect.w = sr.w - dx; newRect.h = sr.h - dy;
    } else if (actionRef.current === 'ne') {
        newRect.y = sr.y + dy;
        newRect.w = sr.w + dx; newRect.h = sr.h - dy;
    } else if (actionRef.current === 'sw') {
        newRect.x = sr.x + dx;
        newRect.w = sr.w - dx; newRect.h = sr.h + dy;
    } else if (actionRef.current === 'se') {
        newRect.w = sr.w + dx; newRect.h = sr.h + dy;
    }

    currentRectRef.current = newRect;
    drawOverlay(newRect);
  };

  const handleMouseUp = () => {
    if (actionRef.current && currentRectRef.current) {
        const r = currentRectRef.current;
        // Normalize rect on mouse up to lock the coordinates safely
        const norm = {
            x: r.w < 0 ? r.x + r.w : r.x,
            y: r.h < 0 ? r.y + r.h : r.y,
            w: Math.abs(r.w),
            h: Math.abs(r.h)
        };
        // Require a minimum size so accidental clicks don't make 1x1 px boxes
        if (norm.w > 20 && norm.h > 20) {
            setCropRect(norm);
            drawOverlay(norm);
        } else {
            setCropRect(null);
            drawOverlay(null);
        }
    }
    actionRef.current = null;
  };

  // --- THE FINAL CROP (pdf-lib) ---
  const applyCropAndDownload = async () => {
    if (!file || !cropRect || !pageViewport) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Math: PDF coordinate system starts from BOTTOM-LEFT, Canvas starts from TOP-LEFT.
      const pdfX = cropRect.x;
      const pdfWidth = cropRect.w;
      const pdfHeight = cropRect.h;
      const pdfY = pageViewport.height - (cropRect.y + cropRect.h);

      pages.forEach(page => {
        page.setCropBox(pdfX, pdfY, pdfWidth, pdfHeight);
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_cropped_${file.name}`;
      link.click();

      setIsDone(true);
      setIsProcessing(false);

    } catch (error) {
      console.error("Cropping Error:", error);
      alert("Something went wrong.");
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
            <Crop className="w-6 h-6 text-blue-600" /> Crop PDF
          </h1>
        </div>
      </div>

      {!file && (
        <>
          <div className="mb-10 bg-blue-50 border border-blue-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all">
             <div className="p-4 bg-blue-100 rounded-2xl shrink-0">
               <Scissors className="w-8 h-8 text-blue-600" />
             </div>
             <div>
                <h3 className="font-black text-blue-900 text-xl mb-2">Remove Useless White Margins</h3>
                <p className="text-blue-800 text-sm font-medium leading-relaxed mb-4">
                  Make your E-books and Notes perfectly readable on mobile screens. Upload a PDF, draw a box around the main text, and we will instantly cut off the empty borders from all pages.
                </p>
                <p className="text-blue-800 text-sm font-bold">
                  💡 Zero Quality Loss. We modify the internal PDF framing, keeping your text crystal clear and selectable.
                </p>
             </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pb-10">
            <div 
              onClick={() => isEngineReady && fileInputRef.current?.click()} 
              className={`w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
            >
              <div className="bg-blue-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300 shadow-inner">
                <Crop className="w-16 h-16 text-blue-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Trim PDF Margins</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Visually draw a box to crop all pages of your document instantly.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-xl pointer-events-none">
                Select PDF File
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        </>
      )}

      {/* THE INTERACTIVE CROP EDITOR */}
      {file && !isProcessing && !isDone && (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Panel: Viewer & Canvas */}
          <div className="flex-1 bg-slate-200 p-4 rounded-[2rem] border border-slate-300 shadow-inner flex flex-col items-center justify-start overflow-hidden min-h-[600px] overflow-auto">
             {pdfjsDoc ? (
               <div className="relative shadow-2xl rounded-sm bg-white cursor-crosshair select-none m-auto shrink-0 border border-slate-300">
                 
                 <canvas ref={bgCanvasRef} className="block" />
                 
                 <canvas 
                    ref={fgCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="absolute inset-0 block touch-none"
                 />
                 
               </div>
             ) : (
               <Loader2 className="w-10 h-10 animate-spin text-slate-500 mt-20" />
             )}
          </div>

          {/* Right Panel: Controls */}
          <div className="w-full lg:w-80 bg-white rounded-[2rem] border border-slate-200 p-6 shadow-xl flex flex-col shrink-0 h-fit sticky top-24">
            <h3 className="font-black text-slate-800 text-lg mb-1 truncate" title={file.name}>{file.name}</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Visual Crop Editor</p>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
              <p className="text-sm font-medium text-blue-900 leading-relaxed">
                <MousePointerSquareDashed className="w-5 h-5 inline-block mr-2 text-blue-600" />
                <span className="font-bold">Pro Tip:</span> Draw a box. You can now <span className="font-bold text-blue-700">drag it from the center</span> to move it, or <span className="font-bold text-blue-700">drag the white corners</span> to resize it perfectly!
              </p>
            </div>

            <div className="h-px bg-slate-100 w-full mb-6"></div>

            <button 
              disabled={!cropRect}
              onClick={applyCropAndDownload} 
              className="w-full py-4 font-black text-white bg-blue-600 hover:bg-slate-900 shadow-xl shadow-blue-200 rounded-2xl transition-all flex justify-center items-center gap-2 mb-3 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:shadow-none"
            >
              <Scissors className="w-5 h-5" /> Crop All Pages
            </button>
            <button onClick={() => {setFile(null); setPdfjsDoc(null)}} className="w-full py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
          </div>

        </div>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
           <h3 className="text-2xl font-black text-slate-800">Trimming Margins...</h3>
           <p className="text-slate-500 mt-2 font-medium">Applying new coordinates to all pages...</p>
         </div>
      )}

      {isDone && (
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
             <div className="p-6 bg-blue-50 rounded-full mb-6 border-4 border-blue-100">
               <CheckCircle className="w-16 h-16 text-blue-600" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-3">Cropped! ✂️</h3>
             <p className="text-slate-500 font-medium mb-8">The empty margins have been removed. Your text quality remains 100% original.</p>
             
             <button onClick={() => { setFile(null); setIsDone(false); setPdfjsDoc(null); }} className="w-full py-4 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
               Crop Another File
             </button>
          </div>
        </div>
      )}

    </div>
  );
}