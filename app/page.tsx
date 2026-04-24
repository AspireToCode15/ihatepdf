'use client';

import React from 'react';
import { 
  FilePlus2, Scissors, Shrink, LockOpen, FileImage, 
  FileText, Table, Image as ImageIcon, 
  FileSignature, RotateCw, Globe, Lock, ShieldAlert,
  Bot, ScanText, Sparkles, Receipt, Fingerprint, 
  FileBadge, Ghost, Eraser, Images, Moon, Droplet, Stamp, Zap,
  Headphones, SearchCheck, Scale, Crop, FileOutput, UserCircle
} from 'lucide-react';
import Link from 'next/link';
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-10 md:py-20 relative">
      
      {/* 🌟 VIBRANT GLOWING BACKGROUND BLOBS (Cool Tones) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] opacity-40 pointer-events-none -z-10 flex justify-center">
        <div className="w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse"></div>
        <div className="w-72 h-72 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse -ml-20 mt-20"></div>
        <div className="w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse -ml-20 -mt-10"></div>
      </div>
      
      {/* 🚀 THE BRIGHT HERO SECTION */}
      <div className="text-center max-w-4xl mx-auto mb-20 md:mb-32 relative">
        
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white text-slate-800 text-[10px] md:text-xs font-black tracking-widest mb-8 md:mb-10 shadow-sm border border-indigo-100 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          PROCESSED LOCALLY. ZERO SERVER UPLOADS.
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-[5.5rem] font-black tracking-tight text-slate-900 mb-6 md:mb-8 leading-[1.05]">
          PDFs shouldn't be <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500">
            a privacy nightmare.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed mb-12 px-4">
          The world's fastest, fully-offline document suite. Extract, merge, unlock, and analyze PDFs using your browser's raw power. Welcome to the colorful side.
        </p>

        {/* 🚀 DYNAMIC AUTH SECTION */}
        <div className="mb-12 md:mb-16 relative z-50 px-4">
          {session ? (
             <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 p-2 pr-6 rounded-full flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-indigo-100/50 inline-flex min-w-[280px] sm:min-w-[340px] w-full sm:w-auto animate-in zoom-in-95 duration-500">
               <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
                 {session.user?.image ? (
                    <img src={session.user.image} alt="Profile" className="w-12 h-12 rounded-full shadow-sm border border-slate-100 object-cover shrink-0" />
                 ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                      <UserCircle className="w-8 h-8 text-indigo-400" />
                    </div>
                 )}
                 <div className="text-center sm:text-left pr-2">
                   <p className="font-black text-slate-800 leading-tight truncate max-w-[150px] sm:max-w-[180px]">{session.user?.name}</p>
                   <p className="text-[11px] text-fuchsia-500 font-black uppercase tracking-widest truncate max-w-[150px] sm:max-w-[180px]">{session.user?.email}</p>
                 </div>
               </div>
               <button onClick={() => signOut()} className="w-full sm:w-auto bg-slate-50 hover:bg-fuchsia-50 text-slate-600 hover:text-fuchsia-600 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm cursor-pointer border border-transparent hover:border-fuchsia-200">
                 Logout
               </button>
             </div>
          ) : (
            <button 
              onClick={(e) => { 
                e.preventDefault(); 
                signIn("google", { callbackUrl: '/' }); 
              }} 
              className="relative z-50 cursor-pointer w-full sm:w-auto bg-white/80 backdrop-blur-md border border-indigo-100 hover:border-indigo-300 text-slate-800 px-8 py-4 rounded-full font-black text-base md:text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100/50 mx-auto hover:shadow-2xl hover:shadow-indigo-200/50 hover:-translate-y-1"
            >
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-40 px-4">
           <a href="#tools" className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
             Explore All Tools
           </a>
           <a href="/resume-ats" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-full font-black text-lg hover:from-fuchsia-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-fuchsia-200 hover:shadow-2xl hover:shadow-fuchsia-300 hover:-translate-y-1 group">
             <Sparkles className="w-5 h-5 group-hover:animate-spin" /> Try ATS Genie
           </a>
        </div>
      </div>

      <div className="space-y-20 md:space-y-32" id="tools">
        
        {/* 🚀 CATEGORY 1: NEXT-GEN MAGIC */}
        <section className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-14 relative overflow-hidden border border-indigo-100 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 md:mb-12 relative z-10 gap-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-indigo-900 flex items-center gap-3 tracking-tight">
                <Zap className="text-indigo-500 w-6 h-6 md:w-8 md:h-8" /> Next-Gen Magic
              </h2>
              <p className="text-indigo-600/80 mt-2 font-semibold text-sm md:text-base">Tools you won't find on boring PDF sites. 100% Native.</p>
            </div>
            <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase self-start md:self-auto shadow-sm">
              Exclusive
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
            <ColorCard href="/listen-pdf" icon={<Headphones />} title="Listen to PDF" desc="Turn any document into a human-voice audiobook instantly." colorTheme="violet" />
            <ColorCard href="/bulk-search" icon={<SearchCheck />} title="Bulk PDF Search" desc="Search a single keyword across 50+ PDFs in one second." colorTheme="emerald" />
            <ColorCard href="/compare-pdf" icon={<Scale />} title="Compare PDFs" desc="Spot the exact text differences between two file versions." colorTheme="teal" />
            <ColorCard href="/visual-crop" icon={<Crop />} title="Visual Cropper" desc="Draw a box to crop out massive page margins visually." colorTheme="pink" />
          </div>
        </section>

        {/* 🚀 CATEGORY 2: THE AI SQUAD */}
        <section>
          <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="h-8 md:h-10 w-2 bg-gradient-to-b from-fuchsia-400 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">AI & Career Suite</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <ColorCard href="/resume-ats" icon={<FileBadge />} title="ATS Genie" desc="Scan your resume against any Job Description." colorTheme="fuchsia" />
            <ColorCard href="/chat-pdf" icon={<Bot />} title="Chat with PDF" desc="Ask questions, extract summaries using AI." colorTheme="indigo" />
            <ColorCard href="/smart-ocr" icon={<ScanText />} title="Smart OCR" desc="Extract text from scanned images accurately." colorTheme="blue" />
            <ColorCard href="/invoice-extractor" icon={<Receipt />} title="Invoice to Excel" desc="Auto-extract data from invoices to CSV." colorTheme="teal" />
          </div>
        </section>

        {/* 🚀 CATEGORY 3: SECURITY & PRIVACY */}
        <section>
          <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="h-8 md:h-10 w-2 bg-gradient-to-b from-slate-400 to-slate-800 rounded-full"></div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Security & Privacy</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <ColorCard href="/remove-metadata" icon={<Ghost />} title="Ghost PDF" desc="Strip hidden metadata, author info, and trackers instantly." colorTheme="slate" />
            <ColorCard href="/redact-pdf" icon={<Eraser />} title="Redact PDF" desc="Permanently blackout sensitive text like Aadhar/PAN." colorTheme="stone" />
            <ColorCard href="/unlock" icon={<LockOpen />} title="Unlock PDF" desc="Remove password security offline. Keep files safe." colorTheme="emerald" />
            <ColorCard href="/protect" icon={<Lock />} title="Protect PDF" desc="Encrypt your PDF with military-grade passwords." colorTheme="slate" />
            <ColorCard href="/mask-id" icon={<Fingerprint />} title="Aadhaar Masker" desc="Auto-blur sensitive ID numbers using local AI." colorTheme="purple" />
            <ColorCard href="/e-sign-pdf" icon={<FileSignature />} title="e-Sign PDF" desc="Add legally binding digital signatures offline." colorTheme="blue" />
          </div>
        </section>

        {/* 🚀 CATEGORY 4: CORE CONVERSIONS & UTILITIES */}
        <section>
          <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="h-8 md:h-10 w-2 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Convert & Organize</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:gap-6">
            <ColorCard href="/word-to-pdf" icon={<FileOutput />} title="Word to PDF" desc="Turn DOC/DOCX into crisp PDFs." colorTheme="blue" />
            <ColorCard href="/pdf-to-word" icon={<FileText />} title="PDF to Word" desc="Extract layout to editable DOCX." colorTheme="indigo" />
            <ColorCard href="/pdf-to-excel" icon={<Table />} title="PDF to Excel" desc="Map tables offline into XLSX." colorTheme="emerald" />
            <ColorCard href="/jpg-to-pdf" icon={<ImageIcon />} title="JPG to PDF" desc="Convert images to PDF format." colorTheme="violet" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            <ColorCard href="/merge" icon={<FilePlus2 />} title="Merge PDF" desc="Combine multiple PDFs visually." colorTheme="fuchsia" />
            <ColorCard href="/split" icon={<Scissors />} title="Split PDF" desc="Extract pages or split a PDF." colorTheme="cyan" />
            <ColorCard href="/compress" icon={<Shrink />} title="Compress PDF" desc="Reduce size with max quality." colorTheme="emerald" />
            <ColorCard href="/organize" icon={<RotateCw />} title="Organize PDF" desc="Rotate or delete specific pages." colorTheme="lime" />
            <ColorCard href="/watermark" icon={<FileImage />} title="Add Watermark" desc="Stamp images or text over PDF." colorTheme="pink" />
          </div>
        </section>

        {/* 🚀 CATEGORY 5: POWER HACKS */}
        <section>
          <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="h-8 md:h-10 w-2 bg-gradient-to-b from-indigo-400 to-violet-600 rounded-full"></div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Power Hacks</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <ColorCard href="/image-extractor" icon={<Images />} title="Image Extractor" desc="Pull all high-res images to a ZIP file." colorTheme="pink" />
            <ColorCard href="/dark-mode-pdf" icon={<Moon />} title="Dark Mode PDF" desc="Convert white pages to eye-friendly dark mode." colorTheme="slate" />
            <ColorCard href="/ink-saver" icon={<Droplet />} title="Ink Saver" desc="Convert colored PDFs to grayscale for printing." colorTheme="cyan" />
            <ColorCard href="/flatten-forms" icon={<Stamp />} title="Flatten Forms" desc="Lock fillable forms permanently." colorTheme="fuchsia" />
          </div>
        </section>

      </div>
    </div>
  );
}

// ✨ THE COOL & SLEEK CARD COMPONENT (100% Orange Free)
function ColorCard({ href, icon, title, desc, colorTheme }: { href: string, icon: React.ReactNode, title: string, desc: string, colorTheme: string }) {
  
  const colors: Record<string, string> = {
    violet: "hover:border-violet-300 hover:shadow-violet-200/50 text-violet-600 bg-violet-50",
    emerald: "hover:border-emerald-300 hover:shadow-emerald-200/50 text-emerald-600 bg-emerald-50",
    fuchsia: "hover:border-fuchsia-300 hover:shadow-fuchsia-200/50 text-fuchsia-600 bg-fuchsia-50",
    indigo: "hover:border-indigo-300 hover:shadow-indigo-200/50 text-indigo-600 bg-indigo-50",
    teal: "hover:border-teal-300 hover:shadow-teal-200/50 text-teal-600 bg-teal-50",
    slate: "hover:border-slate-300 hover:shadow-slate-200 text-slate-700 bg-slate-50",
    stone: "hover:border-stone-300 hover:shadow-stone-200 text-stone-700 bg-stone-50",
    blue: "hover:border-blue-300 hover:shadow-blue-200/50 text-blue-600 bg-blue-50",
    lime: "hover:border-lime-300 hover:shadow-lime-200/50 text-lime-600 bg-lime-50",
    pink: "hover:border-pink-300 hover:shadow-pink-200/50 text-pink-600 bg-pink-50",
    cyan: "hover:border-cyan-300 hover:shadow-cyan-200/50 text-cyan-600 bg-cyan-50",
    purple: "hover:border-purple-300 hover:shadow-purple-200/50 text-purple-600 bg-purple-50",
  };

  const themeClasses = colors[colorTheme] || colors.slate;
  const hoverStyles = themeClasses.split(' ').filter(c => c.startsWith('hover:')).join(' ');
  const iconBgStyles = themeClasses.split(' ').filter(c => !c.startsWith('hover:')).join(' ');

  return (
    <Link 
      href={href} 
      className={`group p-6 md:p-7 rounded-[2rem] bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm transition-all duration-300 flex flex-col items-start gap-5 cursor-pointer hover:shadow-xl hover:bg-white hover:-translate-y-2 ${hoverStyles} relative overflow-hidden`}
    >
      <div className={`p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 flex items-center justify-center border border-transparent group-hover:border-current ${iconBgStyles}`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-7 h-7" })}
      </div>
      <div>
        <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1.5 tracking-tight group-hover:text-current transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 font-semibold leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}