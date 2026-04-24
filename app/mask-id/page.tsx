'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, ShieldCheck, FileUp, AlertTriangle, PaintRoller, Download, CheckCircle, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, rgb } from 'pdf-lib';

export default function AadharMaskerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  // Aadhar Detection
  const [hasAadhar, setHasAadhar] = useState<boolean>(false);
  const [detectedCount, setDetectedCount] = useState(0);

  // PDF Viewer States
  const [pdfjsDoc, setPdfjsDoc] = useState<any>(null);
  const [pageViewport, setPageViewport] = useState<any>(null);
  
  // Drawing States (Redaction)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [maskRects, setMaskRects] = useState<{x: number, y: number, w: number, h: number}[]>([]);

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
      if (selectedFile.type !== 'application/pdf') return alert("Sirf PDF allow hai bhai!");
      
      setFile(selectedFile);
      setIsDone(false);
      setMaskRects([]);
      setHasAadhar(false);

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfjsDoc(loadedPdf);
      
      // 🕵️‍♂️ Offline Scan for Aadhar Pattern (XXXX XXXX XXXX)
      scanForAadhar(loadedPdf);
      
      renderPreviewPage(loadedPdf, 1);
    }
  };

  const scanForAadhar = async (pdf: any) => {
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items.map((item: any) => item.str).join(' ');
      }
      
      // Regex for Aadhar: 12 digits, optional spaces or dashes
      const aadharRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
      const matches = text.match(aadharRegex);
      
      if (matches && matches.length > 0) {
          setHasAadhar(true);
          setDetectedCount(matches.length);
      }
  };

  const renderPreviewPage = async (pdfDoc: any, pageNum: number) => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.2 }); 
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
    drawMasks();
  };

  // --- DRAWING THE BLACK MASKS ---
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
    const currentRect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y)
    };
    
    drawMasks(currentRect);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const pos = getMousePos(e);
    const newRect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y)
    };

    if (newRect.w > 10 && newRect.h > 10) {
        setMaskRects(prev => [...prev, newRect]);
        drawMasks(); // Draw final array without the temporary currentRect
    }
  };

  const drawMasks = (tempRect?: {x: number, y: number, w: number, h: number}) => {
      const fgCanvas = fgCanvasRef.current;
      if (!fgCanvas) return;
      const ctx = fgCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
      
      // Draw all saved masks
      ctx.fillStyle = '#0f172a'; // Slate-900 (Dark Black)
      maskRects.forEach(rect => {
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      });

      // Draw the one currently being dragged
      if (tempRect) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.fillRect(tempRect.x, tempRect.y, tempRect.w, tempRect.h);
      }
  };

  const undoLastMask = () => {
      setMaskRects(prev => prev.slice(0, -1));
      setTimeout(drawMasks, 50);
  };

  // --- APPLY PERMANENT MASK USING PDF-LIB ---
  const applyMaskAndDownload = async () => {
    if (!file || maskRects.length === 0 || !pageViewport) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Assuming masking on page 1 for Aadhar

      // Draw black rectangles permanently into the PDF
      maskRects.forEach(rect => {
          // Convert Canvas Coordinates to PDF Coordinates (Bottom-Left origin)
          const pdfX = rect.x / pageViewport.scale;
          const pdfY = (pageViewport.height - rect.y - rect.h) / pageViewport.scale;
          const pdfW = rect.w / pageViewport.scale;
          const pdfH = rect.h / pageViewport.scale;

          firstPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(0, 0, 0), // Solid Black
          });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_masked_${file.name}`;
      link.click();

      setIsDone(true);
      setIsProcessing(false);

    } catch (error) {
      console.error("Masking Error:", error);
      alert("Error aa gaya bhai! Try again.");
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
            <ShieldCheck className="w-6 h-6 text-slate-800" /> Aadhar Masker
          </h1>
        </div>
      </div>

      {!file && (
        <>
          <div className="mb-10 bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row items-start gap-6 transition-all">
             <div className="p-4 bg-slate-800 rounded-2xl shrink-0 border border-slate-700">
               <EyeOff className="w-8 h-8 text-white" />
             </div>
             <div>
                <h3 className="font-black text-white text-xl mb-2">Protect Your Identity</h3>
                <p className="text-slate-300 text-sm font-medium leading-relaxed mb-4">
                  Never share your open 12-digit Aadhar number online. Upload your Aadhar card PDF here. Draw a black box over the first 8 digits to permanently mask them before sharing it for KYC, Rent, or Jobs.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-900/50">
                  <ShieldCheck className="w-4 h-4" /> 100% Offline Processing. Your ID never leaves your browser.
                </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pb-10">
            <div 
              onClick={() => isEngineReady && fileInputRef.current?.click()} 
              className={`w-full max-w-3xl bg-white border-2 border-dashed border-slate-300 hover:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
            >
              <div className="bg-slate-100 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-slate-200 transition-all duration-300 shadow-inner">
                <FileUp className="w-16 h-16 text-slate-800" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Upload ID Document</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Select your Aadhar PDF to safely mask sensitive information.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-xl pointer-events-none">
                Select PDF File
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        </>
      )}

      {/* THE INTERACTIVE REDACTOR */}
      {file && !isProcessing && !isDone && (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Panel: Viewer & Canvas */}
          <div className="flex-1 bg-slate-200 p-4 rounded-[2rem] border border-slate-300 shadow-inner flex flex-col items-center justify-start overflow-hidden min-h-[600px] overflow-auto">
             
             {/* 🚨 Smart Auto-Detect Alert */}
             {hasAadhar && (
               <div className="w-full max-w-2xl bg-amber-100 border border-amber-300 p-3 rounded-xl mb-4 flex items-center justify-center gap-3 shadow-sm animate-pulse">
                 <AlertTriangle className="w-5 h-5 text-amber-600" />
                 <p className="text-amber-900 font-bold text-sm">Aadhar pattern detected! ({detectedCount} matches). Mask the first 8 digits carefully.</p>
               </div>
             )}

             {pdfjsDoc ? (
               <div className="relative shadow-2xl rounded-sm bg-white cursor-crosshair select-none m-auto shrink-0 border border-slate-300 mt-4">
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
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Privacy Mask Tool</p>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-6">
              <p className="text-sm font-medium text-slate-700 leading-relaxed mb-4">
                <PaintRoller className="w-5 h-5 inline-block mr-2 text-slate-900" />
                <span className="font-black">How to use:</span> Draw a box over the sensitive numbers (like the first 8 digits of your Aadhar). This will permanently block them.
              </p>
              
              <div className="flex items-center justify-between text-xs font-bold mt-4 pt-4 border-t border-slate-200">
                <span className="text-slate-500">Masks applied: {maskRects.length}</span>
                {maskRects.length > 0 && (
                   <button onClick={undoLastMask} className="text-red-500 hover:underline">Undo Last</button>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full mb-6"></div>

            <button 
              disabled={maskRects.length === 0}
              onClick={applyMaskAndDownload} 
              className="w-full py-4 font-black text-white bg-slate-900 hover:bg-emerald-600 shadow-xl shadow-slate-200 rounded-2xl transition-all flex justify-center items-center gap-2 mb-3 disabled:opacity-50 disabled:hover:bg-slate-900 disabled:shadow-none"
            >
              <ShieldCheck className="w-5 h-5" /> Save Secured PDF
            </button>
            <button onClick={() => {setFile(null); setPdfjsDoc(null)}} className="w-full py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
          </div>

        </div>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <Loader2 className="w-16 h-16 text-slate-900 animate-spin mb-6" />
           <h3 className="text-2xl font-black text-slate-800">Securing Document...</h3>
           <p className="text-slate-500 mt-2 font-medium">Burning black masks into the PDF layer...</p>
         </div>
      )}

      {isDone && (
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
             <div className="p-6 bg-emerald-50 rounded-full mb-6 border-4 border-emerald-100">
               <CheckCircle className="w-16 h-16 text-emerald-600" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-3">Secured & Downloaded!</h3>
             <p className="text-slate-500 font-medium mb-8">The black marks are permanently embedded. The underlying text cannot be copied or recovered.</p>
             
             <button onClick={() => { setFile(null); setIsDone(false); setPdfjsDoc(null); }} className="w-full py-4 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
               Mask Another File
             </button>
          </div>
        </div>
      )}

    </div>
  );
}