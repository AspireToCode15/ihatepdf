'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Code2, Loader2, Download, ArrowLeft, FileCode2, Layout } from 'lucide-react';
import Link from 'next/link';

export default function HTMLToPDFPage() {
  const [htmlContent, setHtmlContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      alert('Only .html and .htm files are accepted!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setHtmlContent(event.target?.result as string);
      setActiveTab('preview');
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 🔥 UPDATED: Iframe ab hamesha update hoga, chahe koi bhi tab open ho
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const document = iframe.contentDocument || iframe.contentWindow?.document;
      if (document) {
        document.open();
        document.write(`
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 20px; }
            }
            body { font-family: system-ui, sans-serif; }
          </style>
          ${htmlContent || '<div style="color:#94a3b8; text-align:center; padding:40px; font-family:sans-serif;">No HTML content yet. Paste code or upload a file.</div>'}
        `);
        document.close();
      }
    }
  }, [htmlContent]);

  // 🔥 UPDATED ENGINE: Auto-switch tab and print safely
  const generatePDF = () => {
    if (!htmlContent.trim()) return alert('enter any html document first!');
    
    // Auto-switch to preview so the iframe is fully visible for the browser engine
    setActiveTab('preview');
    setIsProcessing(true);
    
    // Thoda delay taaki DOM settle ho jaye aur browser print dialog ready kar le
    setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        alert("try again please!");
      }
      setIsProcessing(false);
    }, 800);
  };

  const loadDummyTemplate = () => {
    setHtmlContent(`
<div style="max-w: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); font-size: 16px; line-height: 24px; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; color: #555;">
  <table cellpadding="0" cellspacing="0" style="width: 100%; line-height: inherit; text-align: left;">
    <tr>
      <td colspan="2" style="padding-bottom: 20px;">
        <h2 style="color: #333;">INVOICE #1024</h2>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom: 40px;">
        <strong>ihatepdf. Tools</strong><br>
        Mumbai, Maharashtra<br>
        hello@ihatepdf.com
      </td>
      <td style="text-align: right; padding-bottom: 40px;">
        <strong>Billed To:</strong><br>
        Pro Developer<br>
        React/Next.js Master
      </td>
    </tr>
  </table>
  <table style="width: 100%; line-height: inherit; text-align: left; border-collapse: collapse;">
    <tr style="background: #eee; border-bottom: 1px solid #ddd; font-weight: bold;">
      <td style="padding: 10px;">Service</td>
      <td style="text-align: right; padding: 10px;">Price</td>
    </tr>
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px;">Premium PDF API</td>
      <td style="text-align: right; padding: 10px;">$300.00</td>
    </tr>
    <tr style="font-weight: bold; color: #333;">
      <td style="padding: 10px; text-align: right;">Total:</td>
      <td style="padding: 10px; text-align: right;">$300.00</td>
    </tr>
  </table>
</div>
    `);
    setActiveTab('preview');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-sky-500 hover:text-sky-600 mb-4 tracking-wide uppercase transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">HTML to PDF</h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          Convert raw HTML code or files directly into pixel-perfect PDFs. <span className="text-slate-700 font-bold">100% Local.</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button onClick={() => setActiveTab('editor')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'editor' ? 'bg-white text-sky-600 border-b-2 border-sky-500' : 'text-slate-500 hover:text-slate-700'}`}>
              <Code2 className="w-4 h-4" /> Source Code
            </button>
            <button onClick={() => setActiveTab('preview')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'preview' ? 'bg-white text-sky-600 border-b-2 border-sky-500' : 'text-slate-500 hover:text-slate-700'}`}>
              <Layout className="w-4 h-4" /> Live Preview
            </button>
          </div>

          {/* 🔥 FIX: Dono elements DOM mein rahenge, sirf CSS opacity change hogi */}
          <div className="flex-1 relative bg-slate-50">
            <textarea 
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste your HTML code here..."
              className={`absolute inset-0 w-full h-full resize-none p-6 text-sm font-mono text-slate-700 bg-white focus:outline-none focus:ring-inset focus:ring-2 focus:ring-sky-500 transition-opacity duration-200 ${activeTab === 'editor' ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'}`}
            />
            <iframe 
              ref={iframeRef}
              title="HTML Preview"
              className={`absolute inset-0 w-full h-full bg-white border-none transition-opacity duration-200 ${activeTab === 'preview' ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'}`}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col h-fit shadow-lg">
          <h3 className="text-xl font-black text-slate-800 mb-6 pb-6 border-b border-slate-100 flex items-center gap-2">
            <Globe className="w-6 h-6 text-sky-500" /> Export Options
          </h3>
          
          <div className="space-y-4 mb-8">
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold hover:bg-slate-50 hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center justify-center gap-2">
              <FileCode2 className="w-5 h-5" /> Upload .html File
            </button>
            <input type="file" accept=".html,.htm" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button onClick={loadDummyTemplate} className="w-full py-3 px-4 rounded-xl bg-sky-50 text-sky-600 font-bold hover:bg-sky-100 transition-colors flex items-center justify-center gap-2 text-sm">
              Load Sample Invoice Template
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
             <p className="text-xs font-bold text-slate-500 leading-relaxed">
               Pro Tip: When the print dialog opens, select <span className="text-slate-800">"Save as PDF"</span> as your destination.
             </p>
          </div>

          <button onClick={generatePDF} disabled={!htmlContent.trim() || isProcessing} className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${!htmlContent.trim() ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-slate-900 text-white hover:bg-sky-500 hover:shadow-sky-200 hover:-translate-y-1'}`}>
            {isProcessing ? <><Loader2 className="w-6 h-6 animate-spin" /> Preparing...</> : <><Download className="w-6 h-6" /> Export to PDF</>}
          </button>
        </div>

      </div>
    </div>
  );
}