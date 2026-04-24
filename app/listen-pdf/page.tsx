'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Headphones, Play, Pause, Square, FileUp, Info, Volume2, Mic2 } from 'lucide-react';
import Link from 'next/link';

export default function ListenPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  // Audio Player States
  const [pdfTextBlocks, setPdfTextBlocks] = useState<string[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 🔥 THE FIX: Replaced laggy State with blazing fast Refs
  const charIndexRef = useRef(0);
  const teleprompterRef = useRef<HTMLDivElement>(null);
  const isManualStop = useRef(false);
  
  // Voice Settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [playbackRate, setPlaybackRate] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      setIsEngineReady(true);
    } else {
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
    }

    const populateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          const defaultVoice = availableVoices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB'));
          if (defaultVoice) setSelectedVoice(defaultVoice.name);
          else setSelectedVoice(availableVoices[0].name);
        }
      }
    };

    populateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      
      setFile(selectedFile);
      setIsReady(false);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentBlockIndex(0);
      charIndexRef.current = 0;
    }
  };

  const handleExtractTextAndPrepAudio = async () => {
    if (!file) return;
    setIsProcessing(true);

    const pdfjsLib = (window as any).pdfjsLib;
    let extractedPages: string[] = [];

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ').replace(/\s+/g, ' ').trim();
        if (pageText.length > 10) {
            extractedPages.push(pageText);
        }
      }

      if (extractedPages.length === 0) {
        alert("Something went wrong!");
        setIsProcessing(false);
        return;
      }

      setPdfTextBlocks(extractedPages);
      setIsReady(true);
      setIsProcessing(false);
      
      // Initial render for teleprompter
      setTimeout(() => updateTeleprompterDOM(0, extractedPages[0]), 100);

    } catch (error) {
      console.error("Text Extraction Error:", error);
      alert("somehing went wrong.");
      setIsProcessing(false);
    }
  };

  // 🔥 DIRECT DOM MANIPULATION (Bypasses React Re-renders for 0 Lag)
  const updateTeleprompterDOM = (cIndex: number, fullText: string) => {
    if (!teleprompterRef.current || !fullText) return;
    
    if (cIndex === 0 && !isPlaying) {
        teleprompterRef.current.innerHTML = `<span class="text-slate-300">${fullText}</span>`;
        return;
    }

    const beforeHighlight = fullText.substring(0, cIndex);
    const remaining = fullText.substring(cIndex);
    const nextSpace = remaining.indexOf(' ');
    const wordEnd = nextSpace === -1 ? remaining.length : nextSpace;
    
    const highlightedWord = remaining.substring(0, wordEnd);
    const afterHighlight = remaining.substring(wordEnd);

    // Fast HTML Injection
    teleprompterRef.current.innerHTML = `
      <span class="text-slate-500 transition-colors">${beforeHighlight}</span>
      <span class="bg-indigo-600 text-white rounded-md px-1 py-0.5 mx-0.5 shadow-lg shadow-indigo-500/30 font-bold transition-all">${highlightedWord}</span>
      <span class="text-slate-300 transition-colors">${afterHighlight}</span>
    `;
  };

  const playAudio = (
    index: number = currentBlockIndex, 
    startFrom: number = charIndexRef.current, 
    vName: string = selectedVoice, 
    vRate: number = playbackRate
  ) => {
    if (!window.speechSynthesis || pdfTextBlocks.length === 0) return;

    isManualStop.current = true;
    window.speechSynthesis.cancel(); 

    setTimeout(() => {
      const fullText = pdfTextBlocks[index];
      if (!fullText) return;

      const textToSpeak = fullText.substring(startFrom);
      
      if (!textToSpeak.trim()) {
         if (index + 1 < pdfTextBlocks.length) {
            setCurrentBlockIndex(index + 1);
            charIndexRef.current = 0;
            playAudio(index + 1, 0, vName, vRate);
         } else {
            setIsPlaying(false);
         }
         return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = vRate;
      
      const liveVoices = window.speechSynthesis.getVoices();
      const voiceToUse = liveVoices.find(v => v.name === vName) || voices.find(v => v.name === vName);

      if (voiceToUse) {
        utterance.voice = voiceToUse;
        utterance.lang = voiceToUse.lang;
      }

      // 🔥 EXTREME PERFORMANCE UPDATE
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          charIndexRef.current = startFrom + event.charIndex;
          updateTeleprompterDOM(charIndexRef.current, fullText);
        }
      };

      utterance.onend = () => {
        if (!isManualStop.current) {
          if (index + 1 < pdfTextBlocks.length) {
            setCurrentBlockIndex(index + 1);
            charIndexRef.current = 0;
            setTimeout(() => playAudio(index + 1, 0, vName, vRate), 100);
          } else {
            setIsPlaying(false);
            charIndexRef.current = 0;
            updateTeleprompterDOM(0, pdfTextBlocks[index]);
          }
        }
      };

      isManualStop.current = false;
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      setCurrentBlockIndex(index);
    }, 50);
  };

  const pauseAudio = () => {
    if (!window.speechSynthesis) return;
    isManualStop.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const stopAudio = () => {
    if (!window.speechSynthesis) return;
    isManualStop.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentBlockIndex(0);
    charIndexRef.current = 0;
    if (pdfTextBlocks.length > 0) {
      updateTeleprompterDOM(0, pdfTextBlocks[0]);
    }
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const newVoice = e.target.value;
     setSelectedVoice(newVoice);
     if (isPlaying) {
         playAudio(currentBlockIndex, charIndexRef.current, newVoice, playbackRate);
     }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newSpeed = parseFloat(e.target.value);
     setPlaybackRate(newSpeed);
     if (isPlaying) {
         playAudio(currentBlockIndex, charIndexRef.current, selectedVoice, newSpeed);
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
            <Headphones className="w-6 h-6 text-indigo-600" /> Listen to PDF
          </h1>
        </div>
      </div>

      {!file && (
        <>
          <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
             <div className="p-4 bg-indigo-100 rounded-2xl shrink-0">
               <Volume2 className="w-8 h-8 text-indigo-600" />
             </div>
             <div>
                <h3 className="font-black text-indigo-900 text-xl mb-2">The Magic Audiobook Maker</h3>
                <p className="text-indigo-800 text-sm font-medium leading-relaxed mb-4">
                  Tired of reading long notes or reports? Upload your text-heavy PDF here. Our engine extracts the text and uses your device's native AI voice engine to read it out loud to you like a podcast.
                </p>
                <p className="text-indigo-800 text-sm font-bold">
                  💡 Processed entirely in your browser. No cloud API costs. No data tracking.
                </p>
             </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pb-10">
            <div 
              onClick={() => isEngineReady && fileInputRef.current?.click()} 
              className={`w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
            >
              <div className="bg-indigo-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-inner">
                <Headphones className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-4xl font-black text-slate-800 mb-4">Turn PDFs into Audiobooks</h3>
              <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Select a document to instantly listen to it with live teleprompter tracking.</p>
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition shadow-xl pointer-events-none">
                Select PDF File
              </button>
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        </>
      )}

      {file && !isProcessing && !isReady && (
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="p-5 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
              <FileUp className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full" title={file.name}>{file.name}</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Ready to extract text for audio processing.</p>
            
            <div className="flex gap-3 w-full">
               <button onClick={() => setFile(null)} className="px-5 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                 Cancel
               </button>
               <button onClick={handleExtractTextAndPrepAudio} className="flex-1 py-4 font-black text-white bg-indigo-600 hover:bg-slate-900 shadow-xl shadow-indigo-200 rounded-2xl transition-all flex justify-center items-center gap-2">
                 <Mic2 className="w-5 h-5" /> Prep Audio
               </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
           <h3 className="text-2xl font-black text-slate-800">Reading Document...</h3>
           <p className="text-slate-500 mt-2 font-medium">Extracting text layout for the speech engine...</p>
         </div>
      )}

      {/* 🎧 THE PREMIUM AUDIO PLAYER UI */}
      {isReady && (
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
             
             {/* Player Header */}
             <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-100">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                   {isPlaying ? (
                      <div className="flex items-end gap-1 h-8">
                        <div className="w-2 bg-indigo-500 animate-[bounce_1s_infinite] h-full rounded-full"></div>
                        <div className="w-2 bg-indigo-500 animate-[bounce_1.2s_infinite] h-2/3 rounded-full"></div>
                        <div className="w-2 bg-indigo-500 animate-[bounce_0.8s_infinite] h-4/5 rounded-full"></div>
                      </div>
                   ) : (
                      <Headphones className="w-10 h-10 text-indigo-300" />
                   )}
                </div>
                <div className="flex-1 min-w-0">
                   <h3 className="text-xl font-black text-slate-800 truncate mb-1" title={file?.name}>{file?.name}</h3>
                   <p className="text-sm font-medium text-slate-500">
                     Playing Page {currentBlockIndex + 1} of {pdfTextBlocks.length}
                   </p>
                </div>
             </div>

             {/* Controls Box */}
             <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 mb-8 w-full">
                
                {/* Play/Pause Buttons */}
                <div className="flex items-center justify-center gap-4 shrink-0">
                   {isPlaying ? (
                     <button onClick={pauseAudio} className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-all shadow-xl hover:scale-105 shrink-0">
                       <Pause className="w-7 h-7 fill-current" />
                     </button>
                   ) : (
                     <button onClick={() => playAudio(currentBlockIndex, charIndexRef.current)} className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:scale-105 shrink-0">
                       <Play className="w-7 h-7 fill-current ml-1" />
                     </button>
                   )}
                   <button onClick={stopAudio} className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all shrink-0">
                     <Square className="w-5 h-5 fill-current" />
                   </button>
                </div>

                {/* Settings (Speed & Voice) */}
                <div className="flex-1 w-full min-w-0 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center gap-4">
                   <div className="flex items-center justify-between gap-4 w-full">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 w-12">Speed</span>
                     <input 
                       type="range" min="0.5" max="2" step="0.1" 
                       value={playbackRate} 
                       onChange={handleSpeedChange}
                       className="flex-1 min-w-0 accent-indigo-600 cursor-pointer"
                     />
                     <span className="text-sm font-black text-indigo-600 shrink-0 w-8 text-right">{playbackRate}x</span>
                   </div>
                   
                   <div className="flex items-center justify-between gap-4 w-full">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 w-12">Voice</span>
                     <select 
                       value={selectedVoice} 
                       onChange={handleVoiceChange}
                       className="flex-1 min-w-0 w-full bg-white border border-slate-200 text-sm font-medium p-2 rounded-lg outline-none focus:border-indigo-500 truncate cursor-pointer"
                     >
                       {voices.map(v => (
                         <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                       ))}
                     </select>
                   </div>
                </div>
             </div>

             {/* Progress Bar Visualizer */}
             <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-500 ease-out" 
                  style={{ width: `${((currentBlockIndex) / pdfTextBlocks.length) * 100}%` }}
                ></div>
             </div>
             
             {/* 🔥 THE ZERO-LAG TELEPROMPTER BOX */}
             <div className="bg-slate-900 rounded-2xl p-6 md:p-8 h-56 overflow-y-auto shadow-inner relative text-left">
               <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none"></div>
               <p 
                 ref={teleprompterRef} 
                 className="text-lg leading-[1.8] font-medium tracking-wide"
               >
                 {pdfTextBlocks[currentBlockIndex] || "No text available on this page."}
               </p>
               <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none"></div>
             </div>

             <button onClick={() => { stopAudio(); setFile(null); setIsReady(false); }} className="w-full mt-8 py-4 font-bold text-slate-600 bg-white border-2 border-slate-100 hover:bg-slate-50 rounded-2xl transition-all">
               Close Player
             </button>
          </div>
        </div>
      )}

    </div>
  );
}