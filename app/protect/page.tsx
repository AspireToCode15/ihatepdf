'use client';

import React, { useState, useRef } from 'react';
import { Lock, FileText, Trash2, Loader2, ShieldCheck, ArrowLeft, UploadCloud, EyeOff, Eye } from 'lucide-react';
import Link from 'next/link';
// @ts-ignore: Ignoring type checks for this specific lightweight package
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';

export default function ProtectPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') return alert("Only pdfs are allowed!");
      setFile(selectedFile);
      setIsDone(false);
      setPassword('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setIsDone(false);
    setPassword('');
  };

  // Calculate visual password strength
  const strengthPercentage = Math.min(100, (password.length / 8) * 100);
  const strengthColor = strengthPercentage < 40 ? 'bg-red-500' : strengthPercentage < 80 ? 'bg-yellow-500' : 'bg-green-500';

  // 🔥 THE REAL ENGINE: Encrypts PDF 100% locally in the browser
  const handleProtect = async () => {
    if (!file) return;
    if (password.length < 4) return alert("password should contain atleast 4 characters!");

    setIsProcessing(true);
    
    try {
      // 1. Convert file to Uint8Array (required by encrypt engine)
      const arrayBuffer = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      
      // 2. Encrypt the PDF using standard RC4/AES compatible spec
      const encryptedBytes = await encryptPDF(pdfBytes, password);

      // 3. Save and Download
     const blob = new Blob([encryptedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ihatepdf_locked_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDone(true);
      setIsProcessing(false);
    } catch (error) {
      console.error("Encryption error:", error);
      alert("Error encrypting your file.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-4 tracking-wide uppercase transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Protect PDF</h1>
        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
          Secure your PDF files with a password. Encrypted <span className="text-slate-700 font-bold">100% locally</span> in your browser.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-all min-h-[350px]"
          >
            <div className="bg-slate-200 p-6 rounded-full mb-6">
              <Lock className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload PDF to Encrypt</h3>
            <p className="text-slate-500 font-medium mb-6">Keep your sensitive documents safe.</p>
            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg pointer-events-none">
              Select Document
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-lg mx-auto w-full py-8">
            
            {/* File Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="bg-white p-3 rounded-xl text-slate-700 border border-slate-200 shadow-sm"><FileText /></div>
                <div className="truncate">
                  <p className="font-bold text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs font-bold text-green-600 flex items-center gap-1 mt-1"><ShieldCheck className="w-3 h-3" /> Ready for Encryption</p>
                </div>
              </div>
              <button onClick={removeFile} className="text-slate-400 hover:text-red-500 transition-colors p-2 shrink-0"><Trash2 /></button>
            </div>

            {/* Password Config */}
            {!isDone ? (
              <div className="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-slate-800">Set a Password</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Don't forget it, or the file is gone forever!</p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password..."
                      className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Strength Indicator */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${strengthPercentage}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {strengthPercentage < 40 ? 'Weak' : strengthPercentage < 80 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleProtect}
                  disabled={isProcessing || password.length < 4}
                  className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
                    password.length < 4 
                      ? 'bg-slate-100 text-slate-400 shadow-none' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1'
                  }`}
                >
                  {isProcessing ? <><Loader2 className="w-6 h-6 animate-spin" /> Encrypting...</> : <><Lock className="w-6 h-6" /> Lock PDF File</>}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-3xl p-8 text-center animate-in zoom-in duration-300">
                <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-800 mb-2">PDF Secured!</h3>
                <p className="text-slate-600 font-medium mb-6">Your file has been encrypted locally and downloaded.</p>
                <button 
                  onClick={() => { setFile(null); setIsDone(false); setPassword(''); }}
                  className="bg-white text-slate-800 border border-slate-200 px-6 py-2 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Encrypt Another File
                </button>
              </div>
            )}

          </div>
        )}
        <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      </div>
    </div>
  );
}