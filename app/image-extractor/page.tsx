'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Images, CheckCircle, FileUp, Download, Info, Zap } from 'lucide-react';
import Link from 'next/link';
import JSZip from 'jszip';

export default function ImageExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [imgCount, setImgCount] = useState(0);
  const [extractionType, setExtractionType] = useState<string | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      setFile(selectedFile);
      setIsDone(false);
      setImgCount(0);
      setExtractionType(null);
    }
  };

  const handleExtractImages = async () => {
    if (!file) return;
    setIsProcessing(true);

    const pdfjsLib = (window as any).pdfjsLib;
    const zip = new JSZip();
    let extractedCount = 0;
    let modeUsed = 'smart';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // ==========================================
      // PLAN A: SMART EXTRACT (Original Embedded Photos)
      // ==========================================
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const operatorList = await page.getOperatorList();
        
        for (let j = 0; j < operatorList.fnArray.length; j++) {
          if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject || 
              operatorList.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject) {
            
            const imgKey = operatorList.argsArray[j][0];
            let image;
            try { image = await page.objs.get(imgKey); } catch (err) { continue; }
            if (!image) continue;

            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            if (image.bitmap) {
                ctx.drawImage(image.bitmap, 0, 0);
            } else if (image.data) {
                const expectedLength = image.width * image.height * 4;
                let rgbaData = new Uint8ClampedArray(expectedLength);

                if (image.data.length === expectedLength) {
                    rgbaData.set(image.data);
                } else if (image.data.length === image.width * image.height * 3) {
                    for (let p = 0, q = 0; p < image.data.length; p += 3, q += 4) {
                        rgbaData[q] = image.data[p]; rgbaData[q+1] = image.data[p+1]; 
                        rgbaData[q+2] = image.data[p+2]; rgbaData[q+3] = 255;
                    }
                } else if (image.data.length === image.width * image.height) {
                    for (let p = 0, q = 0; p < image.data.length; p += 1, q += 4) {
                        rgbaData[q] = image.data[p]; rgbaData[q+1] = image.data[p]; 
                        rgbaData[q+2] = image.data[p]; rgbaData[q+3] = 255;
                    }
                } else { continue; }

                const imgData = new ImageData(rgbaData, image.width, image.height);
                ctx.putImageData(imgData, 0, 0);
            } else { continue; }

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
              extractedCount++;
              zip.file(`ihatepdf_raw_img_${extractedCount}.png`, blob);
            }
          }
        }
      }

      // ==========================================
      // PLAN B: BRUTE FORCE (If no embedded images found)
      // ==========================================
      if (extractedCount === 0) {
        modeUsed = 'brute-force';
        console.log("No raw images found. Activating Brute Force render...");

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            // 2x Scale for HD Quality render without crashing browser RAM
            const viewport = page.getViewport({ scale: 2 }); 
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            // Fill white background (PDFs are transparent natively)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            if (blob) {
              extractedCount++;
              zip.file(`ihatepdf_page_${i}_rendered.jpg`, blob);
            }
        }
      }

      // Generate the ZIP file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_images_${file.name.replace('.pdf', '')}.zip`;
      link.click();

      setExtractionType(modeUsed);
      setImgCount(extractedCount);
      setIsDone(true);
      setIsProcessing(false);

    } catch (error) {
      console.error("Critical Extraction Error:", error);
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
            <Images className="w-6 h-6 text-pink-500" /> Image Extractor
          </h1>
        </div>
      </div>

      {/* Explainer Note */}
      <div className="mb-10 bg-pink-50 border border-pink-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
         <div className="p-4 bg-pink-100 rounded-2xl shrink-0">
           <Info className="w-8 h-8 text-pink-600" />
         </div>
         <div>
            <h3 className="font-black text-pink-900 text-xl mb-2">The "No Excuses" Extractor</h3>
            <p className="text-pink-800 text-sm font-medium leading-relaxed mb-4">
              Need photos from a PDF? We try to extract the hidden raw image files first. If the PDF only contains vectors or flat graphics, our engine automatically shifts to <b>Brute Force Mode</b> and renders High-Res screenshots of every page for you. 
            </p>
            <p className="text-pink-800 text-sm font-bold">
              Guaranteed Results. 100% Offline in your browser.
            </p>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-10">
        
        {!file && (
          <div 
            onClick={() => isEngineReady && fileInputRef.current?.click()} 
            className={`w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 hover:border-pink-300 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
          >
            <div className="bg-pink-50 p-8 rounded-3xl mb-6 group-hover:scale-110 transition-all duration-300 shadow-inner">
              <Images className="w-16 h-16 text-pink-600" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 mb-4">Pull Images From Any PDF</h3>
            <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Extract all embedded photos or High-Res page graphics inside a single ZIP file.</p>
            <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-pink-600 transition shadow-xl pointer-events-none">
              Select PDF File
            </button>
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
        )}

        {file && !isProcessing && !isDone && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="p-5 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
              <Images className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full" title={file.name}>{file.name}</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Ready to extract images offline.</p>
            
            <div className="flex gap-3 w-full">
               <button onClick={() => setFile(null)} className="px-5 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                 Cancel
               </button>
               <button onClick={handleExtractImages} className="flex-1 py-4 font-black text-white bg-pink-600 hover:bg-slate-900 shadow-xl shadow-pink-200 rounded-2xl transition-all flex justify-center items-center gap-2">
                 <Download className="w-5 h-5" /> Extract
               </button>
            </div>
          </div>
        )}

        {isProcessing && (
           <div className="flex flex-col items-center mt-10">
             <Loader2 className="w-16 h-16 text-pink-600 animate-spin mb-6" />
             <h3 className="text-2xl font-black text-slate-800">Processing Document...</h3>
             <p className="text-slate-500 mt-2 font-medium">Scanning layers and rendering pixels...</p>
           </div>
        )}

        {isDone && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
             <div className="p-6 bg-emerald-50 rounded-full mb-6 border-4 border-emerald-100">
               <CheckCircle className="w-16 h-16 text-emerald-500" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-3">Extraction Complete!</h3>
             <p className="text-slate-500 font-medium mb-4">Successfully zipped <b>{imgCount}</b> images.</p>
             
             {/* Dynamic Feedback Tag */}
             {extractionType === 'brute-force' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 mb-8">
                  <Zap className="w-3.5 h-3.5" /> Rendered Pages (No Raw Images Found)
                </div>
             ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 mb-8">
                  <Images className="w-3.5 h-3.5" /> Raw Embedded Photos Extracted
                </div>
             )}

             <button onClick={() => { setFile(null); setIsDone(false); }} className="w-full py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
               Extract Another File
             </button>
          </div>
        )}
      </div>
    </div>
  );
}