'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, SearchCheck, FileUp, Search, FolderSearch, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface IndexedPage {
  pageNum: number;
  text: string;
}

interface IndexedFile {
  fileName: string;
  pages: IndexedPage[];
  isScanned: boolean; // 🔥 NEW: Tells user if PDF has no text
}

interface SearchResult {
  fileName: string;
  pageNum: number;
  snippet: React.ReactNode;
}

export default function BulkSearchPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState({ current: 0, total: 0 });
  const [pdfIndex, setPdfIndex] = useState<IndexedFile[]>([]);
  const [isReady, setIsReady] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      setIsReady(false);
      setPdfIndex([]);
      setSearchResults(null);
      setSearchQuery('');
    }
  };

  // 🚀 THE V2 BULLETPROOF INDEXING ENGINE
  const buildIndex = async () => {
    if (!files || files.length === 0) return;
    setIsIndexing(true);
    setIndexProgress({ current: 0, total: files.length });

    const pdfjsLib = (window as any).pdfjsLib;
    const newIndex: IndexedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') continue;

      try {
        const arrayBuffer = await file.arrayBuffer();
        // 🔥 FIX 1: Convert to Uint8Array for perfect memory reading
        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        
        const pages: IndexedPage[] = [];
        let totalTextLength = 0;

        for (let j = 1; j <= pdf.numPages; j++) {
          const page = await pdf.getPage(j);
          const textContent = await page.getTextContent();
          
          // 🔥 FIX 2: Better Text Normalization (removes broken spaces and newlines)
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ') // Collapse multiple spaces into one
            .trim();

          totalTextLength += pageText.length;
          pages.push({ pageNum: j, text: pageText });
        }

        // 🔥 FIX 3: Detect if it's a scanned image PDF
        newIndex.push({ 
          fileName: file.name, 
          pages, 
          isScanned: totalTextLength < 50 // If entire PDF has less than 50 chars, it's a photo
        });

      } catch (err) {
        console.error(`Skipped ${file.name} (Encrypted or Corrupt)`);
      }
      
      setIndexProgress({ current: i + 1, total: files.length });
    }

    setPdfIndex(newIndex);
    setIsIndexing(false);
    setIsReady(true);
  };

  // 🔍 THE V2 SEARCH ALGORITHM (Crash-Proof)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    setTimeout(() => {
      const results: SearchResult[] = [];
      const queryLower = searchQuery.toLowerCase().trim();

      pdfIndex.forEach(file => {
        // Skip files that are just scanned images (no text to search)
        if (file.isScanned) return;

        file.pages.forEach(page => {
          const textLower = page.text.toLowerCase();
          const matchIndex = textLower.indexOf(queryLower);

          if (matchIndex !== -1) {
            // Create a snippet (50 chars before and after)
            const start = Math.max(0, matchIndex - 50);
            const end = Math.min(page.text.length, matchIndex + queryLower.length + 50);
            
            let rawSnippet = page.text.substring(start, end);
            if (start > 0) rawSnippet = "..." + rawSnippet;
            if (end < page.text.length) rawSnippet = rawSnippet + "...";

            // 🔥 FIX 4: Safely escape Regex so weird characters don't crash the search
            const safeQuery = queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, 'gi');
            
            const snippetParts = rawSnippet.split(regex);
            
            const highlightedSnippet = (
              <span>
                {snippetParts.map((part, i) => 
                  regex.test(part) ? (
                    <mark key={i} className="bg-emerald-200 text-emerald-900 px-1 rounded-sm font-bold shadow-sm">{part}</mark>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </span>
            );

            results.push({
              fileName: file.fileName,
              pageNum: page.pageNum,
              snippet: highlightedSnippet
            });
          }
        });
      });

      setSearchResults(results);
      setIsSearching(false);
    }, 50); // Small delay for UI smoothness
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
            <SearchCheck className="w-6 h-6 text-emerald-600" /> Bulk PDF Search
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pb-10">
        
        {/* State 1: Upload */}
        {!files && (
          <div 
            onClick={() => isEngineReady && fileInputRef.current?.click()} 
            className={`w-full max-w-3xl mt-10 bg-white border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-all cursor-pointer group p-12 md:p-20 ${!isEngineReady && 'opacity-50'}`}
          >
            <div className="bg-emerald-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300 shadow-inner">
              <FileUp className="w-16 h-16 text-emerald-600" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 mb-4">Select Multiple PDFs</h3>
            <p className="text-lg text-slate-500 font-medium mb-8 max-w-md">Drag and drop multiple files to create an instantly searchable offline database.</p>
            <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition shadow-xl pointer-events-none">
              Select Files
            </button>
            <input type="file" accept="application/pdf" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
        )}

        {/* State 2: Ready to Index */}
        {files && !isIndexing && !isReady && (
          <div className="w-full max-w-md mt-10 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="p-5 bg-slate-50 rounded-2xl mb-6 border border-slate-100 relative">
              <FolderSearch className="w-12 h-12 text-slate-500" />
              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-black w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                {files.length}
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Files Queued</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Ready to read and index {files.length} documents into memory.</p>
            
            <div className="flex gap-3 w-full">
               <button onClick={() => setFiles(null)} className="px-5 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                 Cancel
               </button>
               <button onClick={buildIndex} className="flex-1 py-4 font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 rounded-2xl transition-all flex justify-center items-center gap-2">
                 Build Index
               </button>
            </div>
          </div>
        )}

        {/* State 3: Indexing Progress */}
        {isIndexing && (
           <div className="w-full max-w-md mt-10 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl flex flex-col items-center text-center">
             <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mb-6" />
             <h3 className="text-2xl font-black text-slate-800 mb-2">Building Database...</h3>
             <p className="text-slate-500 font-medium mb-6">Reading text from file {indexProgress.current} of {indexProgress.total}</p>
             <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300 ease-out" 
                  style={{ width: `${(indexProgress.current / indexProgress.total) * 100}%` }}
                ></div>
             </div>
           </div>
        )}

        {/* State 4: THE SEARCH ENGINE UI */}
        {isReady && (
          <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-10 duration-500">
             
             {/* Search Bar */}
             <div className="bg-white p-4 pl-6 rounded-full shadow-xl shadow-emerald-900/5 border border-slate-200 flex items-center gap-4 mb-10 sticky top-24 z-10">
                <Search className="w-6 h-6 text-emerald-600" />
                <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Search for an invoice, name, or keyword across all PDFs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 outline-none text-lg font-medium text-slate-800 placeholder:text-slate-400 bg-transparent"
                  />
                  <button type="submit" disabled={isSearching} className="px-8 py-3 bg-slate-900 hover:bg-emerald-600 text-white font-bold rounded-full transition-all disabled:opacity-50">
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
                  </button>
                </form>
             </div>

             {/* Stats & Warnings */}
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-2 gap-4">
               <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                 Database active: <span className="text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{files?.length} files</span>
               </p>
               
               <button onClick={() => { setFiles(null); setIsReady(false); }} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
                 Reset Database
               </button>
             </div>

             {/* 🔥 SCANNED FILE WARNINGS */}
             {pdfIndex.some(f => f.isScanned) && (
               <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
                 <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                 <div>
                   <p className="text-sm font-bold text-amber-900 mb-1">Some files might be Scanned Images</p>
                   <p className="text-xs font-medium text-amber-700 leading-relaxed">
                     We couldn't find any text in the following files (they might be photos/scans). The search engine cannot read them without OCR: 
                     <span className="block mt-1 font-bold">
                       {pdfIndex.filter(f => f.isScanned).map(f => f.fileName).join(', ')}
                     </span>
                   </p>
                 </div>
               </div>
             )}

             {/* Results Area */}
             {searchResults && (
               <div className="space-y-4">
                  <h3 className="font-black text-2xl text-slate-800 mb-6 flex items-center gap-3">
                    Found {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                  </h3>

                  {searchResults.length === 0 ? (
                    <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
                      <p className="text-slate-500 font-medium text-lg">No matches found for "{searchQuery}". Try a different keyword.</p>
                    </div>
                  ) : (
                    searchResults.map((result, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-50 rounded-lg">
                                <FileText className="w-5 h-5 text-emerald-600" />
                              </div>
                              <h4 className="font-black text-slate-800 text-lg truncate max-w-md" title={result.fileName}>
                                {result.fileName}
                              </h4>
                            </div>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-slate-200">
                              Page {result.pageNum}
                           </span>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <p className="text-slate-600 text-sm leading-relaxed italic font-medium">
                             "{result.snippet}"
                           </p>
                         </div>
                      </div>
                    ))
                  )}
               </div>
             )}

             {!searchResults && (
               <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-20 flex flex-col items-center justify-center text-center opacity-70">
                 <FolderSearch className="w-16 h-16 text-slate-300 mb-4" />
                 <h3 className="text-xl font-bold text-slate-400">Database is Ready</h3>
                 <p className="text-slate-400 font-medium mt-2">Type a keyword above and hit enter to search across all uploaded files.</p>
               </div>
             )}

          </div>
        )}

      </div>
    </div>
  );
}