'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Trash2, Loader2, Download, ArrowLeft, CheckCircle, FileSignature, Plus, AlertTriangle, Layers } from 'lucide-react';
import Link from 'next/link';
import { fabric } from 'fabric'; 
import { PDFDocument } from 'pdf-lib';

// Type definition for Multi-Page
interface PdfPage {
  pageNum: number;
  bgUrl: string;
  width: number;
  height: number;
}

export default function ESignPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  
  // 🔥 MULTI-PAGE STATE
  const [pages, setPages] = useState<PdfPage[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const [sigPadCanvas, setSigPadCanvas] = useState<fabric.Canvas | null>(null);
  
  const fabricCanvases = useRef<{ [key: number]: fabric.Canvas }>({});
  const activePageRef = useRef<number>(1); // Tracks which page user is looking at

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

  // 2. SIGNATURE PAD INIT
  useEffect(() => {
    if (file && signaturePadRef.current && !sigPadCanvas) {
      const spc = new fabric.Canvas(signaturePadRef.current, {
        isDrawingMode: true,
        width: 300,
        height: 150,
        backgroundColor: '#f8fafc',
      });
      spc.freeDrawingBrush.width = 3;
      spc.freeDrawingBrush.color = '#0f172a';
      setSigPadCanvas(spc);
    }
  }, [file, sigPadCanvas]);

  // 3. MULTI-PAGE EXTRACTOR
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only PDF files are allowed!");
      
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) return alert("Loading Assets please wait!");

      setFile(selectedFile);
      setIsDone(false);
      setIsPdfLoading(true);
      setDebugError(null);
      setPages([]);
      
      Object.values(fabricCanvases.current).forEach(fc => fc.dispose());
      fabricCanvases.current = {};
      activePageRef.current = 1;

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        const numPages = pdf.numPages;
        const extractedPages: PdfPage[] = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.3 }); 

            const tempCanvas = document.createElement('canvas');
            const context = tempCanvas.getContext('2d');
            if (!context) throw new Error("Canvas context failed.");

            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            extractedPages.push({
                pageNum: i,
                bgUrl: tempCanvas.toDataURL('image/png'),
                width: viewport.width,
                height: viewport.height
            });
        }
        
        setPages(extractedPages);
        setIsPdfLoading(false);
      } catch (error: any) {
        setDebugError(error.message || error.toString());
        setIsPdfLoading(false);
      }
    }
  };

  // 4. INIT CANVAS FOR EVERY PAGE
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
                backgroundColor: null,
              });
              
              // Track active page on click
              fc.on('mouse:down', () => { activePageRef.current = p.pageNum; });
              fabricCanvases.current[p.pageNum] = fc;
            }
          }
        });
      }, 100);
    }
  }, [pages]);

  const clearSignaturePad = () => {
    if (!sigPadCanvas) return;
    sigPadCanvas.clear();
    sigPadCanvas.backgroundColor = '#f8fafc';
    sigPadCanvas.renderAll();
  };

  const changeBrushColor = (color: string) => {
    if (sigPadCanvas && sigPadCanvas.freeDrawingBrush) {
      sigPadCanvas.freeDrawingBrush.color = color;
    }
  };

  // 🔥 5. ADD SIGNATURE TO ACTIVE PAGE
  const addSignatureToDocument = () => {
    const targetCanvas = fabricCanvases.current[activePageRef.current] || fabricCanvases.current[1];
    if (!targetCanvas) return alert("Wait until the PDF loads!");
    if (!sigPadCanvas) return;
    if (sigPadCanvas.getObjects().length === 0) return alert("first draw the signature to proceed!");

    const sigDataUrl = sigPadCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });

    fabric.Image.fromURL(sigDataUrl, (img) => {
      img.scale(0.5);
      img.set({
        left: targetCanvas.getWidth() / 2 - (img.width! * 0.5) / 2,
        top: targetCanvas.getHeight() / 2 - (img.height! * 0.5) / 2,
        cornerColor: '#6366f1',
        cornerSize: 12,
        transparentCorners: false,
      });
      targetCanvas.add(img);
      targetCanvas.setActiveObject(img);
      targetCanvas.renderAll();
    });
    
    clearSignaturePad();
  };

  // 🔥 6. MULTI-PAGE BAKE ENGINE
  const handleFinish = async () => {
    if (!file) return;

    let totalEdits = 0;
    Object.values(fabricCanvases.current).forEach(fc => {
        totalEdits += fc.getObjects().length;
    });
    
    if (totalEdits === 0) return alert("Do Atleast one signature !");

    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfPages = pdfDoc.getPages();

      for (let i = 0; i < pdfPages.length; i++) {
          const pageNum = i + 1;
          const fc = fabricCanvases.current[pageNum];
          
          if (fc && fc.getObjects().length > 0) {
              fc.discardActiveObject();
              fc.renderAll();

              const overlayDataUrl = fc.toDataURL({ format: 'png', multiplier: 2 });
              const overlayImage = await pdfDoc.embedPng(overlayDataUrl);
              const { width: pdfWidth, height: pdfHeight } = pdfPages[i].getSize();

              pdfPages[i].drawImage(overlayImage, {
                  x: 0,
                  y: 0,
                  width: pdfWidth,
                  height: pdfHeight,
              });
          }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_signed_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);
    } catch (error) {
      alert("something went wrong!");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 h-screen flex flex-col bg-slate-50">
      <div className="mb-6 flex items-center justify-between shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 uppercase transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-indigo-500" /> e-Sign PDF Pro <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md uppercase tracking-wider font-bold">Multi-Page</span>
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
            {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing All Pages...</> : isDone ? <><CheckCircle className="w-5 h-5" /> Signed & Downloaded!</> : <><Download className="w-5 h-5" /> Finish & Download</>}
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden relative">
        {!file && (
          <div className="flex-1 bg-white border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
            {!isEngineReady ? (
              <div className="flex flex-col items-center justify-center p-16 z-10 bg-white/80 backdrop-blur-sm absolute inset-0">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h3 className="text-2xl font-black text-slate-800">Initializing Pro Engine...</h3>
              </div>
            ) : null}

            <div onClick={() => isEngineReady && fileInputRef.current?.click()} className={`p-16 flex flex-col items-center transition-all duration-300 ${!isEngineReady ? 'opacity-20 pointer-events-none' : 'cursor-pointer group'}`}>
              <div className="bg-indigo-100 p-8 rounded-full mb-6 group-hover:scale-110 group-hover:bg-indigo-200 transition-all duration-300 shadow-inner">
                <FileSignature className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Upload Document to Sign</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Multi-page supported. Sign on any page, exactly where you want it.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition shadow-xl pointer-events-none">
                Select Document
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        )}

        {file && (
          <>
            <div className="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col overflow-y-auto z-20">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                 <h3 className="font-black text-slate-800 text-lg">Your Signature</h3>
                 <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors p-2"><Trash2 className="w-5 h-5" /></button>
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="flex bg-slate-50 p-1.5 rounded-xl mb-4 border border-slate-200">
                    <button className="flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all bg-white text-indigo-600 shadow-sm border border-slate-100"><PenTool className="w-4 h-4" /> Draw Sign</button>
                </div>
                
                <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner mb-3">
                    <canvas ref={signaturePadRef} />
                </div>

                <div className="flex justify-between items-center px-1">
                  <button onClick={clearSignaturePad} className="text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-wider">Clear Pad</button>
                  <div className="flex gap-2">
                    {['#0f172a', '#2563eb', '#dc2626'].map(color => (
                        <button key={color} onClick={() => changeBrushColor(color)} className="w-6 h-6 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <button onClick={addSignatureToDocument} disabled={!!debugError} className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-xl font-black hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0">
                  <Plus className="w-5 h-5" /> Insert into Document
                </button>
                <p className="text-xs text-slate-500 mt-4 text-center">Click on any page in the right panel, then click "Insert" to drop your sign there.</p>
              </div>
            </div>

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
                </div>
              ) : (
                pages.map((p) => (
                  <div key={p.pageNum} className="relative shadow-2xl border border-slate-200 bg-white shrink-0 group hover:ring-4 ring-indigo-300 transition-all cursor-pointer" style={{ width: p.width, height: p.height }} onClick={() => { activePageRef.current = p.pageNum; }}>
                    <div className={`absolute -left-14 top-4 font-black w-10 h-10 flex items-center justify-center rounded-full shadow-md z-30 transition-transform group-hover:scale-110 ${activePageRef.current === p.pageNum ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                       {p.pageNum}
                    </div>
                    <img src={p.bgUrl} alt={`Page ${p.pageNum}`} className="absolute inset-0 w-full h-full pointer-events-none" />
                    <div className="absolute inset-0 z-10">
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