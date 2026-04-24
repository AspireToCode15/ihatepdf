'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Trash2, Loader2, Download, ArrowLeft, Plus, Settings, CheckCircle, FileOutput } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

interface ImageFile {
  file: File;
  previewUrl: string;
}

export default function JpgToPdfPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'fit'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === 'image/jpeg' || file.type === 'image/png'
      );
      
      if (selectedFiles.length === 0) return alert("Only jpg or png images are allowed!");

      const newImages = selectedFiles.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));

      setImages(prev => [...prev, ...newImages]);
      setIsDone(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].previewUrl);
      newImages.splice(index, 1);
      return newImages;
    });
    setIsDone(false);
  };

  // 🔥 THE REAL ENGINE: Converts Images to a single PDF locally
  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    
    try {
      const pdfDoc = await PDFDocument.create();

      for (const imgObj of images) {
        const imageBytes = await imgObj.file.arrayBuffer();
        let pdfImage;
        
        // Check if PNG or JPG and embed accordingly
        if (imgObj.file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(imageBytes);
        } else {
          pdfImage = await pdfDoc.embedJpg(imageBytes);
        }

        let pageDimensions: [number, number];
        
        // A4 Dimensions in points (1 pt = 1/72 inch)
        const a4Portrait: [number, number] = [595.28, 841.89];
        const a4Landscape: [number, number] = [841.89, 595.28];

        if (pageSize === 'fit') {
          pageDimensions = [pdfImage.width, pdfImage.height];
        } else {
          pageDimensions = orientation === 'portrait' ? a4Portrait : a4Landscape;
        }

        const page = pdfDoc.addPage(pageDimensions);

        // Calculate Margins
        let marginPoints = 0;
        if (margin === 'small') marginPoints = 20;
        if (margin === 'large') marginPoints = 50;

        const maxWidth = page.getWidth() - (marginPoints * 2);
        const maxHeight = page.getHeight() - (marginPoints * 2);

        // Scale image to fit within the page (and margins) while maintaining aspect ratio
        const scaledDims = pdfImage.scaleToFit(maxWidth, maxHeight);

        // Draw image centered on the page
        page.drawImage(pdfImage, {
          x: page.getWidth() / 2 - scaledDims.width / 2,
          y: page.getHeight() / 2 - scaledDims.height / 2,
          width: scaledDims.width,
          height: scaledDims.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      
      // 🛠️ FIX: Added 'as any' to bypass strict TypeScript checks on Vercel
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_converted_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);
    } catch (error) {
      console.error("Conversion error:", error);
      alert("error converting your images please try again!.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-yellow-600 hover:text-yellow-700 mb-4 tracking-wide uppercase transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">JPG to PDF</h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          Convert JPG and PNG images to a perfect PDF document. <span className="text-slate-700 font-bold">Adjust size, orientation, and margins.</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Main Canvas Area */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm min-h-[500px] flex flex-col">
          {images.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-yellow-300 bg-yellow-50/30 rounded-2xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-yellow-50 hover:border-yellow-400 transition-all"
            >
              <div className="bg-yellow-100 p-6 rounded-full mb-6 shadow-sm">
                <ImageIcon className="w-12 h-12 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload Images</h3>
              <p className="text-slate-500 font-medium mb-6">Drop your JPG or PNG files here</p>
              <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-yellow-500 transition shadow-lg pointer-events-none">
                Select Images
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">{images.length} Image(s) Selected</h3>
                <button 
                  onClick={() => setImages([])} 
                  className="text-sm font-bold text-red-500 hover:text-red-600"
                >
                  Clear All
                </button>
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {images.map((img, index) => (
                  <div key={index} className="relative group bg-slate-50 rounded-xl border border-slate-200 aspect-[3/4] overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.previewUrl} alt={`upload-${index}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => removeImage(index)}
                        className="bg-white text-red-500 p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-black px-2 py-1 rounded backdrop-blur-sm">
                      {index + 1}
                    </div>
                  </div>
                ))}
                
                {/* Add More Button */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 hover:border-yellow-400 transition-colors"
                >
                  <Plus className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-500">Add More</span>
                </div>
              </div>
            </div>
          )}
          <input type="file" accept="image/jpeg, image/png" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>

        {/* Sidebar Settings Area */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm h-fit sticky top-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <Settings className="w-5 h-5 text-yellow-600" />
            <h3 className="text-xl font-black text-slate-800">Page Settings</h3>
          </div>

          <div className="space-y-6 flex-1 opacity-100 transition-opacity">
            
            {/* Page Size */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Page Size</label>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setPageSize('a4')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${pageSize === 'a4' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>A4 Size</button>
                <button onClick={() => setPageSize('fit')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${pageSize === 'fit' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Fit to Image</button>
              </div>
            </div>

            {/* Orientation (Only show if A4) */}
            {pageSize === 'a4' && (
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Orientation</label>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setOrientation('portrait')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orientation === 'portrait' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Portrait</button>
                  <button onClick={() => setOrientation('landscape')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orientation === 'landscape' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Landscape</button>
                </div>
              </div>
            )}

            {/* Margin (Only show if A4) */}
            {pageSize === 'a4' && (
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Margin</label>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setMargin('none')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${margin === 'none' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>No Margin</button>
                  <button onClick={() => setMargin('small')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${margin === 'small' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Small</button>
                  <button onClick={() => setMargin('large')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${margin === 'large' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Big</button>
                </div>
              </div>
            )}

          </div>

          <button 
            onClick={handleConvert}
            disabled={images.length === 0 || isProcessing}
            className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all mt-8 ${
              images.length === 0 ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-yellow-500 text-slate-900 hover:bg-slate-900 hover:text-white shadow-xl hover:-translate-y-1'
            }`}
          >
            {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : isDone ? <><CheckCircle className="w-5 h-5" /> Done!</> : <><FileOutput className="w-5 h-5" /> Convert to PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}