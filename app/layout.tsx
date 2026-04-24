import type { Metadata } from 'next';
import './globals.css';
import { Sparkles, ChevronDown, Zap, ShieldAlert, FileText, Bot, Menu, X } from 'lucide-react';
import { Providers } from './Providers';

export const metadata: Metadata = {
  title: 'ihatepdf. | Fast, Colorful, Premium PDF Tools',
  description: 'Lightning fast, 100% private PDF tools. Processed directly in your browser.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      {/* 🚀 VIBRANT & SOOTHING PEACHY-CREAM GRADIENT BACKGROUND (Eye-Care Mode) */}
      <body className="bg-gradient-to-br from-[#FFF8F4] via-[#FFF0E8] to-[#FFEBF0] text-slate-900 antialiased selection:bg-fuchsia-200 selection:text-fuchsia-900 flex flex-col min-h-screen relative">
        
        {/* 🌈 Top Vibrant Cool Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 absolute top-0 left-0 z-[100]"></div>

        <Providers>
          
          {/* 🚀 THE VIBRANT NAVBAR */}
          <nav className="bg-white/60 backdrop-blur-xl border-b border-indigo-100/50 sticky top-0 z-50 shadow-sm mt-1.5">
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
              
              {/* Logo - Cool Gradient */}
              <a href="/" className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 hover:opacity-80 transition-opacity flex items-baseline">
                ihate<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">pdf</span><span className="text-fuchsia-600">.</span>
              </a>
              
              {/* 💻 DESKTOP MENU */}
              <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-600 h-full">
                
                {/* Dropdown Trigger */}
                <div className="group h-full flex items-center relative">
                  <button className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors h-full cursor-pointer py-2">
                    All PDF Tools <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                  
                  {/* 🔥 THE COLORFUL MEGA MENU */}
                  <div className="absolute top-[80px] right-[-150px] xl:right-[-250px] bg-white/95 backdrop-blur-3xl border border-indigo-50 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(99,102,241,0.15)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 p-8 z-50 w-max transform group-hover:translate-y-0 translate-y-3">
                      <div className="flex gap-10">
                          {/* Column 1 */}
                          <div className="flex flex-col gap-3.5 min-w-[160px]">
                             <span className="text-xs uppercase text-slate-400 font-black tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Core Tools</span>
                             <a href="/merge" className="hover:text-fuchsia-500 transition-colors whitespace-nowrap pt-1">Merge PDF</a>
                             <a href="/split" className="hover:text-cyan-500 transition-colors whitespace-nowrap">Split PDF</a>
                             <a href="/compress" className="hover:text-emerald-500 transition-colors whitespace-nowrap">Compress PDF</a>
                             <a href="/pdf-to-word" className="hover:text-indigo-500 transition-colors whitespace-nowrap mt-2">PDF to Word</a>
                             <a href="/word-to-pdf" className="hover:text-blue-500 transition-colors whitespace-nowrap">Word to PDF</a>
                             <a href="/pdf-to-excel" className="hover:text-teal-500 transition-colors whitespace-nowrap">PDF to Excel</a>
                          </div>

                          {/* Column 2 */}
                          <div className="flex flex-col gap-3.5 min-w-[160px]">
                             <span className="text-xs uppercase text-slate-400 font-black tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-emerald-500" /> Privacy</span>
                             <a href="/unlock" className="hover:text-emerald-500 transition-colors whitespace-nowrap pt-1">Unlock PDF</a>
                             <a href="/protect" className="hover:text-slate-800 transition-colors whitespace-nowrap">Protect PDF</a>
                             <a href="/remove-metadata" className="hover:text-slate-500 transition-colors whitespace-nowrap">Ghost PDF</a>
                             <a href="/redact-pdf" className="hover:text-stone-800 transition-colors whitespace-nowrap">Redact PDF</a>
                             <a href="/sign" className="hover:text-purple-500 transition-colors whitespace-nowrap">e-Sign PDF</a>
                          </div>

                          {/* Column 3 */}
                          <div className="flex flex-col gap-3.5 min-w-[160px]">
                             <span className="text-xs uppercase text-slate-400 font-black tracking-widest border-b border-slate-100 pb-2">Utilities</span>
                             <a href="/organize" className="hover:text-lime-500 transition-colors whitespace-nowrap pt-1">Organize PDF</a>
                             <a href="/watermark" className="hover:text-blue-400 transition-colors whitespace-nowrap">Add Watermark</a>
                             <a href="/image-extractor" className="hover:text-pink-500 transition-colors whitespace-nowrap">Image Extractor</a>
                             <a href="/dark-mode-pdf" className="hover:text-slate-800 transition-colors whitespace-nowrap">Dark Mode PDF</a>
                             <a href="/flatten-forms" className="hover:text-fuchsia-500 transition-colors whitespace-nowrap">Flatten Forms</a>
                          </div>

                          {/* Column 4 - Vivid Purple Accent */}
                          <div className="flex flex-col gap-3.5 bg-violet-50/80 p-6 -my-6 rounded-2xl border border-violet-100 min-w-[190px]">
                             <span className="text-xs uppercase text-violet-600 font-black tracking-widest border-b border-violet-200 pb-2 flex items-center gap-2"><Zap className="w-4 h-4" /> Next-Gen Magic</span>
                             <a href="/listen-pdf" className="hover:text-violet-800 text-violet-600 transition-colors whitespace-nowrap pt-1 flex items-center justify-between">Listen to PDF <span className="bg-gradient-to-r from-cyan-400 to-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-md ml-2 font-black tracking-wider shadow-sm">HOT</span></a>
                             <a href="/bulk-search" className="hover:text-emerald-600 transition-colors whitespace-nowrap">Bulk PDF Search</a>
                             <a href="/compare-pdf" className="hover:text-teal-600 transition-colors whitespace-nowrap">Compare PDFs</a>
                             <a href="/visual-crop" className="hover:text-pink-600 transition-colors whitespace-nowrap">Visual Cropper</a>
                             <a href="/ink-saver" className="hover:text-cyan-600 transition-colors whitespace-nowrap">Ink Saver</a>
                          </div>

                          {/* Column 5 - Vivid Pink/Fuchsia Accent */}
                          <div className="flex flex-col gap-3.5 bg-fuchsia-50/80 p-6 -my-6 -mr-6 rounded-r-[2rem] border-l border-fuchsia-100 min-w-[190px]">
                             <span className="text-xs uppercase text-fuchsia-600 font-black tracking-widest border-b border-fuchsia-200 pb-2 flex items-center gap-2"><Bot className="w-4 h-4" /> AI Squad</span>
                             <a href="/resume-ats" className="text-fuchsia-600 hover:text-fuchsia-800 font-black transition-colors flex items-center gap-1.5 whitespace-nowrap pt-1"><Sparkles className="w-4 h-4" /> ATS Genie</a>
                             <a href="/chat-pdf" className="hover:text-indigo-600 font-bold transition-colors whitespace-nowrap">Chat with PDF</a>
                             <a href="/smart-ocr" className="hover:text-blue-600 font-bold transition-colors whitespace-nowrap">Smart OCR</a>
                             <a href="/invoice-extractor" className="hover:text-teal-600 font-bold transition-colors whitespace-nowrap">Invoice to Excel</a>
                             <a href="/mask-id" className="hover:text-purple-600 font-bold transition-colors whitespace-nowrap mt-2">Aadhaar Masker</a>
                          </div>
                      </div>
                  </div>
                </div>

                <a href="/merge" className="hover:text-fuchsia-500 transition-colors duration-300">Merge</a>
                <a href="/compress" className="hover:text-emerald-500 transition-colors duration-300">Compress</a>
                <a href="/listen-pdf" className="hover:text-violet-600 transition-colors duration-300 flex items-center gap-1.5">
                   Listen <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                </a>
              </div>

              {/* 📱 MOBILE HAMBURGER MENU */}
              <div className="lg:hidden flex items-center">
                <details className="group relative">
                  <summary className="list-none p-2 bg-white/50 hover:bg-white border border-indigo-100 rounded-xl cursor-pointer transition-colors outline-none marker:hidden">
                    <Menu className="w-6 h-6 text-slate-800 group-open:hidden" />
                    <X className="w-6 h-6 text-slate-800 hidden group-open:block" />
                  </summary>
                  
                  {/* Mobile Dropdown Panel */}
                  <div className="absolute top-full right-0 mt-4 w-[calc(100vw-2rem)] max-w-sm bg-white/95 backdrop-blur-xl border border-indigo-100 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(99,102,241,0.15)] p-6 z-50 max-h-[75vh] overflow-y-auto overscroll-contain">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                      {/* Sections */}
                      <div className="flex flex-col gap-3.5">
                         <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100 pb-2">Core Tools</span>
                         <a href="/merge" className="text-sm font-bold text-slate-700 hover:text-fuchsia-500">Merge PDF</a>
                         <a href="/split" className="text-sm font-bold text-slate-700 hover:text-cyan-500">Split PDF</a>
                         <a href="/compress" className="text-sm font-bold text-slate-700 hover:text-emerald-500">Compress PDF</a>
                         <a href="/pdf-to-word" className="text-sm font-bold text-slate-700 hover:text-indigo-500">PDF to Word</a>
                      </div>
                      
                      <div className="flex flex-col gap-3.5">
                         <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100 pb-2">Privacy</span>
                         <a href="/unlock" className="text-sm font-bold text-slate-700 hover:text-emerald-500">Unlock PDF</a>
                         <a href="/protect" className="text-sm font-bold text-slate-700 hover:text-slate-900">Protect PDF</a>
                         <a href="/remove-metadata" className="text-sm font-bold text-slate-700 hover:text-gray-500">Ghost PDF</a>
                         <a href="/redact-pdf" className="text-sm font-bold text-slate-700 hover:text-stone-800">Redact PDF</a>
                      </div>

                      <div className="flex flex-col gap-3.5">
                         <span className="text-[10px] uppercase text-violet-500 font-black tracking-widest border-b border-violet-100 pb-2">Magic</span>
                         <a href="/listen-pdf" className="text-sm font-bold text-slate-700 hover:text-violet-600">Listen PDF</a>
                         <a href="/compare-pdf" className="text-sm font-bold text-slate-700 hover:text-teal-500">Compare PDFs</a>
                         <a href="/visual-crop" className="text-sm font-bold text-slate-700 hover:text-pink-500">Visual Cropper</a>
                      </div>

                      <div className="flex flex-col gap-3.5">
                         <span className="text-[10px] uppercase text-fuchsia-500 font-black tracking-widest border-b border-fuchsia-100 pb-2">AI Squad</span>
                         <a href="/resume-ats" className="text-sm font-black text-fuchsia-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> ATS Genie</a>
                         <a href="/chat-pdf" className="text-sm font-bold text-slate-700 hover:text-indigo-500">Chat with PDF</a>
                         <a href="/smart-ocr" className="text-sm font-bold text-slate-700 hover:text-blue-500">Smart OCR</a>
                         <a href="/mask-id" className="text-sm font-bold text-slate-700 hover:text-purple-500">Aadhaar Masker</a>
                      </div>
                    </div>
                  </div>
                </details>
              </div>

            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-grow relative z-10 overflow-hidden">
            {children}
          </main>

          {/* 🌟 PREMIUM CENTERED FOOTER */}
          <footer className="bg-white/60 backdrop-blur-md border-t border-indigo-100/50 py-12 mt-auto relative z-10">
            <div className="max-w-3xl mx-auto px-4 flex flex-col items-center justify-center gap-4 text-center">
               
               {/* Footer Logo */}
               <a href="/" className="font-black text-slate-900 text-2xl tracking-tighter flex items-baseline justify-center hover:opacity-80 transition-opacity">
                 ihate<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-fuchsia-500">pdf</span><span className="text-fuchsia-600">.</span>
               </a>
               
               {/* Tagline */}
               <p className="font-bold text-slate-500 text-sm">
                 100% Offline. 100% Private. <span className="hidden sm:inline mx-1 text-indigo-300">•</span><br className="sm:hidden" /> Colorfully built to break the rules.
               </p>
               
               {/* Copyright */}
               <div className="mt-2 text-xs font-semibold text-slate-400">
                 © 2026 ihatepdf. All rights reserved.
               </div>

            </div>
          </footer>

        </Providers>
      </body>
    </html>
  );
}