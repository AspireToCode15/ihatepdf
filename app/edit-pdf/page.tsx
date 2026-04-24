'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Type, Square, PenTool, MousePointer2, Trash2, Loader2, Download, ArrowLeft, CheckCircle, FileEdit, AlertTriangle, Layers, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { fabric } from 'fabric'; 
import { PDFDocument } from 'pdf-lib';

// Type definition for our Multi-Page System
interface PdfPage {
  pageNum: number;
  bgUrl: string;
  width: number;
  height: number;
}

export default function EditPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  
  // 🔥 THE MULTI-PAGE STATE
  const [pages, setPages] = useState<PdfPage[]>([]);
  
  // 🔥 PRO FEATURES STATE
  const [color, setColor] = useState<string>('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [opacity, setOpacity] = useState<number>(1);
  
  // Refs to track multiple canvases and inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null); // For Logo/Image upload
  const fabricCanvases = useRef<{ [key: number]: fabric.Canvas }>({});
  const activePageRef = useRef<number>(1); // Remembers which page user clicked last

  // 1. ENGINE LOADER
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

  // 2. MULTI-PAGE EXTRACTOR ENGINE
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) return alert("Loading assets please wait!");

      setFile(selectedFile);
      setIsDone(false);
      setIsPdfLoading(true);
      setDebugError(null);
      setPages([]);
      
      // Cleanup old canvases if any
      Object.values(fabricCanvases.current).forEach(fc => fc.dispose());
      fabricCanvases.current = {};
      activePageRef.current = 1;

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        const numPages = pdf.numPages;
        const extractedPages: PdfPage[] = [];

        // Safety limit for browser memory (Warns if PDF is huge)
        if (numPages > 50) {
            alert("your pdf files hai 50+ pages so it may take some extra time to process your pdf... please wait..!!");
        }

        // Loop through ALL pages
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.3 }); // Optimal scale for multi-page

            const tempCanvas = document.createElement('canvas');
            const context = tempCanvas.getContext('2d');
            if (!context) throw new Error("Canvas 2D context failed.");

            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            const bgImageUrl = tempCanvas.toDataURL('image/png');
            extractedPages.push({
                pageNum: i,
                bgUrl: bgImageUrl,
                width: viewport.width,
                height: viewport.height
            });
        }
        
        setPages(extractedPages);
        setIsPdfLoading(false);
      } catch (error: any) {
        console.error("PDF preview error:", error);
        setDebugError(error.message || error.toString());
        setIsPdfLoading(false);
      }
    }
  };

  // 3. INITIALIZE CANVAS FOR EVERY PAGE
  useEffect(() => {
    if (pages.length > 0) {
      setTimeout(() => {
        pages.forEach((p) => {
          if (!fabricCanvases.current[p.pageNum]) {
            const canvasEl = document.getElementById(`canvas-page-${p.pageNum}`);
            if (canvasEl) {
              const fc = new fabric.Canvas(canvasEl, {
                width: p.width,
                height: p.height,
                backgroundColor: null, // Transparent
              });
              
              // Track which page the user is currently editing
              fc.on('mouse:down', () => {
                 activePageRef.current = p.pageNum;
              });

              fabricCanvases.current[p.pageNum] = fc;
            }
          }
        });
      }, 100);
    }
  }, [pages]);

  // 🔥 4. PRO FEATURE: Sync settings (Color, Size, Opacity) across all canvases dynamically
  useEffect(() => {
    Object.values(fabricCanvases.current).forEach((fc) => {
      // Hex to RGBA conversion for Highlighter effect
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const rgbaColor = `rgba(${r},${g},${b},${opacity})`;

      if (fc.freeDrawingBrush) {
        fc.freeDrawingBrush.color = rgbaColor;
        fc.freeDrawingBrush.width = strokeWidth;
      }

      // Live update if an object is selected
      const activeObj = fc.getActiveObject();
      if (activeObj) {
        if (activeObj.type === 'i-text') {
          activeObj.set({ fill: rgbaColor });
        } else if (activeObj.type === 'rect') {
          activeObj.set({ stroke: rgbaColor, strokeWidth: strokeWidth });
        }
        // Apply overall opacity
        activeObj.set({ opacity: opacity });
        fc.renderAll();
      }
    });
  }, [color, strokeWidth, opacity, activeTool]);

  // 5. GLOBAL EDITING TOOLS (Applies to all canvases)
  const setTool = (tool: string) => {
    setActiveTool(tool);
    
    // Hex to RGBA conversion for Brush
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const rgbaColor = `rgba(${r},${g},${b},${opacity})`;

    Object.values(fabricCanvases.current).forEach((fc) => {
        fc.isDrawingMode = false;
        if (tool === 'draw') {
            fc.isDrawingMode = true;
            fc.freeDrawingBrush.color = rgbaColor;
            fc.freeDrawingBrush.width = strokeWidth;
        }
    });
  };

  const addText = () => {
    const targetCanvas = fabricCanvases.current[activePageRef.current] || fabricCanvases.current[1];
    if (!targetCanvas) return;
    
    const text = new fabric.IText('Type something...', {
      left: 50,
      top: 50,
      fontFamily: 'sans-serif',
      fill: color,
      opacity: opacity,
      fontSize: 24,
    });
    targetCanvas.add(text);
    targetCanvas.setActiveObject(text);
    setTool('select');
  };

  const addRectangle = () => {
    const targetCanvas = fabricCanvases.current[activePageRef.current] || fabricCanvases.current[1];
    if (!targetCanvas) return;

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: color,
      strokeWidth: strokeWidth,
      opacity: opacity,
      width: 100,
      height: 60,
    });
    targetCanvas.add(rect);
    targetCanvas.setActiveObject(rect);
    setTool('select');
  };

  // 🔥 PRO FEATURE: Add Image / Logo
  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      fabric.Image.fromURL(data, (img) => {
        const targetCanvas = fabricCanvases.current[activePageRef.current] || fabricCanvases.current[1];
        if (!targetCanvas) return;
        
        img.scaleToWidth(200); // Default reasonable size
        img.set({ opacity: opacity });
        
        targetCanvas.add(img);
        targetCanvas.setActiveObject(img);
        setTool('select');
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same image can be uploaded again if needed
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const deleteSelected = () => {
    Object.values(fabricCanvases.current).forEach((fc) => {
        const activeObjects = fc.getActiveObjects();
        if (activeObjects.length) {
            fc.discardActiveObject();
            activeObjects.forEach(function(object) {
                fc.remove(object);
            });
        }
    });
  };

  // 6. MULTI-PAGE BAKER ENGINE
  const handleFinish = async () => {
    if (!file) return;

    let totalEdits = 0;
    Object.values(fabricCanvases.current).forEach(fc => {
        totalEdits += fc.getObjects().length;
    });
    
    if (totalEdits === 0) return alert("edit something!!");

    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfPages = pdfDoc.getPages();

      // Loop through all original PDF pages
      for (let i = 0; i < pdfPages.length; i++) {
          const pageNum = i + 1;
          const fc = fabricCanvases.current[pageNum];
          
          if (fc && fc.getObjects().length > 0) {
              // Unselect before taking photo
              fc.discardActiveObject();
              fc.renderAll();

              // Get transparent overlay of this specific page
              const overlayDataUrl = fc.toDataURL({ format: 'png', multiplier: 2 });
              const overlayImage = await pdfDoc.embedPng(overlayDataUrl);
              const { width: pdfWidth, height: pdfHeight } = pdfPages[i].getSize();

              // Stamp it onto the exact corresponding page in PDF-lib
              pdfPages[i].drawImage(overlayImage, {
                  x: 0,
                  y: 0,
                  width: pdfWidth,
                  height: pdfHeight,
              });
          }
      }

      // Bake and Download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_edited_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);
    } catch (error) {
      console.error("Editing error:", error);
      alert("error saving your pdf!");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 h-screen flex flex-col bg-slate-50">
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 uppercase transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-indigo-500" /> Edit PDF Pro <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md uppercase tracking-wider font-bold">Multi-Page</span>
          </h1>
        </div>
        
        {file && !debugError && (
          <button 
            onClick={handleFinish} 
            disabled={isProcessing || isDone} 
            className={`px-8 py-3 rounded-xl font-black transition shadow-lg flex items-center gap-2 text-sm ${
              isDone ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-200 hover:-translate-y-0.5'
            }`}
          >
            {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving All Pages...</> : isDone ? <><CheckCircle className="w-5 h-5" /> Saved!</> : <><Download className="w-5 h-5" /> Save Changes</>}
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden relative">
        
        {/* Upload State */}
        {!file && (
          <div className="flex-1 bg-white border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
            {!isEngineReady ? (
              <div className="flex flex-col items-center justify-center p-16 z-10 bg-white/80 backdrop-blur-sm absolute inset-0">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h3 className="text-2xl font-black text-slate-800">Initializing Engine...</h3>
              </div>
            ) : null}

            <div onClick={() => isEngineReady && fileInputRef.current?.click()} className={`p-16 flex flex-col items-center transition-all duration-300 ${!isEngineReady ? 'opacity-20 pointer-events-none' : 'cursor-pointer group'}`}>
              <div className="bg-indigo-100 p-8 rounded-full mb-6 group-hover:scale-110 group-hover:bg-indigo-200 transition-all duration-300 shadow-inner">
                <Layers className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Upload Multi-Page Document</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Edit any page. Add text, draw, insert logos, and highlight.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition shadow-xl pointer-events-none">
                Select Document
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        )}

        {/* Workspace State */}
        {file && (
          <>
            {/* 🔥 WIDER PRO LEFT TOOLBAR */}
            <div className="w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col p-5 gap-6 z-20 overflow-y-auto custom-scrollbar">
              
              {/* Tool Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Main Tools</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTool('select')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${activeTool === 'select' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`} title="Select/Move">
                    <MousePointer2 className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Select</span>
                  </button>
                  <button onClick={() => setTool('draw')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${activeTool === 'draw' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`} title="Draw/Highlight">
                    <PenTool className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Draw</span>
                  </button>
                </div>
              </div>

              {/* Add Elements */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Elements</label>
                <button onClick={addText} className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-400 flex items-center justify-center gap-2 transition-all">
                  <Type className="w-4 h-4 text-indigo-500" /> Add Text
                </button>
                <button onClick={addRectangle} className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-400 flex items-center justify-center gap-2 transition-all">
                  <Square className="w-4 h-4 text-blue-500" /> Add Box
                </button>
                <button onClick={() => imageInputRef.current?.click()} className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-400 flex items-center justify-center gap-2 transition-all">
                  <ImageIcon className="w-4 h-4 text-emerald-500" /> Insert Logo / Image
                </button>
                <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={addImage} />
              </div>

              {/* Pro Formatting Settings */}
              <div className="space-y-5 pt-5 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Style & Formatting</label>
                
                {/* Color Picker */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-3">
                    <span className="text-slate-500">Color</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#0f172a', '#ffffff'].map(c => (
                      <button 
                        key={c} 
                        onClick={() => setColor(c)} 
                        className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-110 shadow-md' : 'border-slate-200 hover:scale-105'}`} 
                        style={{ backgroundColor: c }} 
                      />
                    ))}
                  </div>
                </div>

                {/* Size Slider */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-2">
                    <span className="text-slate-500">Brush / Border Size</span>
                    <span className="text-indigo-600">{strokeWidth}px</span>
                  </div>
                  <input type="range" min="1" max="30" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="w-full accent-indigo-600" />
                </div>

                {/* Opacity/Highlighter Slider */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-2">
                    <span className="text-slate-500">Transparency</span>
                    <span className="text-indigo-600">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
                  <p className="text-[10px] text-slate-400 mt-1">Lower this for Highlighter effect.</p>
                </div>
              </div>

              <div className="flex-1"></div>
              
              <button onClick={deleteSelected} className="mt-4 w-full py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete Selected
              </button>
            </div>

            {/* SCROLLABLE MULTI-PAGE CANVAS AREA */}
            <div className="flex-1 bg-slate-300 rounded-2xl border-2 border-slate-300 overflow-auto flex flex-col items-center py-8 gap-10 shadow-inner custom-scrollbar relative">
              
              {debugError ? (
                <div className="bg-red-50 border-2 border-red-200 p-8 rounded-2xl w-full max-w-lg text-center mt-10">
                   <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                   <h3 className="text-xl font-black text-red-900 mb-2">Crash Report</h3>
                   <p className="text-sm font-bold text-red-700 bg-red-100 p-4 rounded-xl font-mono overflow-auto text-left">{debugError}</p>
                   <button onClick={() => setFile(null)} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-red-700">Try Another File</button>
                </div>
              ) : isPdfLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 absolute inset-0 my-auto h-fit">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-600 mx-auto" />
                  <p className="font-black text-lg text-slate-800">Processing All Pages...</p>
                  <p className="text-sm">Please wait...</p>
                </div>
              ) : (
                pages.map((p) => (
                  <div 
                    key={p.pageNum}
                    className="relative shadow-2xl border border-slate-200 bg-white shrink-0 group" 
                    style={{ width: p.width, height: p.height }}
                  >
                    {/* Page Indicator */}
                    <div className="absolute -left-14 top-4 bg-slate-800 text-white font-black w-10 h-10 flex items-center justify-center rounded-full shadow-md z-30 transition-transform group-hover:scale-110">
                       {p.pageNum}
                    </div>

                    {/* Layer 1: Native PDF Image */}
                    <img src={p.bgUrl} alt={`Page ${p.pageNum}`} className="absolute inset-0 w-full h-full pointer-events-none" />
                    
                    {/* Layer 2: Transparent Fabric Overlay */}
                    <div className="absolute inset-0 z-10" onClick={() => { activePageRef.current = p.pageNum; }}>
                      <canvas id={`canvas-page-${p.pageNum}`} width={p.width} height={p.height} />
                    </div>
                  </div>
                ))
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}