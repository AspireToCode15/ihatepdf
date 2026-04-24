'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Receipt, FileSpreadsheet, Download, FileUp, Sparkles, CheckCircle, AlertTriangle, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSession, signIn } from "next-auth/react";

interface InvoiceData {
  vendorName: string;
  invoiceNumber: string;
  date: string;
  totalAmount: string;
  items: { description: string; quantity: string; price: string; total: string }[];
}

export default function InvoiceToExcelPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [apiError, setApiError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load pdf.js engine
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
      if (selectedFile.type !== 'application/pdf') {
          setApiError("Sirf PDF format allow hai!");
          return;
      }
      
      setFile(selectedFile);
      setInvoiceData(null);
      setApiError('');
    }
  };

  const extractAndAnalyze = async () => {
    if (!file) return;
    setIsProcessing(true);
    setApiError('');

    try {
      // 1. Extract Text Offline
      const pdfjsLib = (window as any).pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      
      let invoiceText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        invoiceText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }

      if (invoiceText.trim().length < 20) {
          setApiError("Is PDF mein text nahi mila (Shayad Photo hai). AI isko theek se padh nahi payega.");
          setIsProcessing(false);
          return;
      }

      // 2. Call the Secure Backend Tollbooth
      const response = await fetch('/api/ai/invoice-to-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceText }),
      });
      
      const apiData = await response.json();

      if (!response.ok) {
        setApiError(apiData.error || "Server issue. Please try again.");
        setIsProcessing(false);
        return;
      }
      
      const parsedData: InvoiceData = JSON.parse(apiData.data);
      setInvoiceData(parsedData);
      setIsProcessing(false);

    } catch (error) {
      console.error("Extraction Error:", error);
      setApiError("AI ne data galat format mein diya ya network error aaya. Ek baar wapas try kar!");
      setIsProcessing(false);
    }
  };

  // 🚀 GENERATE EXCEL (CSV) AND DOWNLOAD
  const downloadCSV = () => {
    if (!invoiceData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Vendor Name,Invoice Number,Date,Total Amount,Item Description,Qty,Price,Item Total\n";

    if (invoiceData.items && invoiceData.items.length > 0) {
      invoiceData.items.forEach(item => {
        const row = [
          `"${invoiceData.vendorName || 'N/A'}"`,
          `"${invoiceData.invoiceNumber || 'N/A'}"`,
          `"${invoiceData.date || 'N/A'}"`,
          `"${invoiceData.totalAmount || 'N/A'}"`,
          `"${item.description || 'N/A'}"`,
          `"${item.quantity || 'N/A'}"`,
          `"${item.price || 'N/A'}"`,
          `"${item.total || 'N/A'}"`
        ].join(",");
        csvContent += row + "\n";
      });
    } else {
        const row = [
            `"${invoiceData.vendorName || 'N/A'}"`,
            `"${invoiceData.invoiceNumber || 'N/A'}"`,
            `"${invoiceData.date || 'N/A'}"`,
            `"${invoiceData.totalAmount || 'N/A'}"`,
            "N/A", "N/A", "N/A", "N/A"
          ].join(",");
          csvContent += row + "\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Invoice_${invoiceData.invoiceNumber || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <Receipt className="w-6 h-6 text-emerald-600" /> Invoice to Excel
          </h1>
        </div>
      </div>

      {/* 🚀 GRACEFUL ERROR BANNER (Tollbooth Paywall) */}
      {apiError && (
        <div className="mb-8 bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold animate-in zoom-in-95">
          <AlertCircle className="w-6 h-6" />
          <p>{apiError}</p>
        </div>
      )}

      {!invoiceData && !isProcessing && (
        <>
          <div className="mb-10 bg-emerald-50 border border-emerald-100 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start gap-6 transition-all hover:shadow-md">
             <div className="p-4 bg-emerald-100 rounded-2xl shrink-0">
               <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
             </div>
             <div>
                <h3 className="font-black text-emerald-900 text-xl mb-2">Automate Your Data Entry</h3>
                <p className="text-emerald-800 text-sm font-medium leading-relaxed mb-4">
                  Stop typing out invoice details manually. Upload any PDF invoice, bill, or receipt. Our AI will instantly read the document, extract all items, prices, and totals, and convert it into a neat Excel (CSV) file.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                  <Sparkles className="w-4 h-4" /> Powered by Gemini AI
                </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pb-10">
            <div className="w-full max-w-3xl bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-10 shadow-sm flex flex-col items-center text-center">
              
              {!file ? (
                 <div 
                   onClick={() => isEngineReady && fileInputRef.current?.click()} 
                   className={`w-full flex flex-col items-center justify-center cursor-pointer group py-10 ${!isEngineReady && 'opacity-50'}`}
                 >
                   <div className="bg-emerald-50 p-8 rounded-3xl mb-6 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300 shadow-inner">
                     <FileUp className="w-16 h-16 text-emerald-600" />
                   </div>
                   <h3 className="text-3xl font-black text-slate-800 mb-4">Upload PDF Invoice</h3>
                   <p className="text-slate-500 font-medium mb-8 max-w-md">Drop your bill here to extract data.</p>
                   
                   {!session ? (
                     <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); signIn("google"); }} className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-xl flex items-center gap-2">
                       <Lock className="w-5 h-5" /> Login to Unlock (5 Free/Day)
                     </button>
                   ) : (
                     <button className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-xl pointer-events-none">
                       Select File
                     </button>
                   )}
                 </div>
              ) : (
                 <div className="w-full flex flex-col items-center justify-center py-10 animate-in zoom-in-95">
                   <div className="p-4 bg-emerald-600 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
                     <Receipt className="w-10 h-10 text-white" />
                   </div>
                   <h3 className="font-black text-slate-800 text-xl mb-1 truncate w-full px-4" title={file.name}>{file.name}</h3>
                   <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider mb-8">Ready to Extract</span>
                   
                   <div className="flex gap-4 w-full max-w-md">
                     <button onClick={() => setFile(null)} className="flex-1 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                       Cancel
                     </button>
                     <button onClick={extractAndAnalyze} className="flex-1 py-4 font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 rounded-2xl transition-all flex justify-center items-center gap-2">
                       <Sparkles className="w-5 h-5" /> Extract Data
                     </button>
                   </div>
                 </div>
              )}
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
        </>
      )}

      {isProcessing && (
         <div className="flex-1 flex flex-col items-center justify-center py-20">
           <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-emerald-100 rounded-full animate-spin border-t-emerald-600"></div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-600" />
           </div>
           <h3 className="text-2xl font-black text-slate-800">AI is analyzing the invoice...</h3>
           <p className="text-slate-500 mt-2 font-medium max-w-md text-center">Reading line items, mapping taxes, and structuring the data into columns...</p>
         </div>
      )}

      {/* 🟢 THE RESULTS DASHBOARD */}
      {invoiceData && !isProcessing && (
        <div className="flex-1 flex flex-col w-full animate-in fade-in slide-in-from-bottom-10 duration-500">
          
          <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Extraction Successful</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Review the data below before downloading.</p>
                </div>
             </div>
             
             <button onClick={downloadCSV} className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
               <Download className="w-5 h-5" /> Download Excel (CSV)
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
             <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Vendor Name</p>
                <p className="text-lg font-black text-slate-800 truncate" title={invoiceData.vendorName}>{invoiceData.vendorName || 'N/A'}</p>
             </div>
             <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Details</p>
                <div className="flex items-center gap-4">
                   <p className="text-lg font-black text-slate-800">#{invoiceData.invoiceNumber || 'N/A'}</p>
                   <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                   <p className="text-sm font-bold text-slate-500">{invoiceData.date || 'N/A'}</p>
                </div>
             </div>
             <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Total Amount</p>
                <p className="text-2xl font-black text-emerald-700">{invoiceData.totalAmount || 'N/A'}</p>
             </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-8">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Line Items ({invoiceData.items?.length || 0})</h3>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-white border-b border-slate-100">
                        <th className="p-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Price</th>
                        <th className="p-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
                     </tr>
                  </thead>
                  <tbody>
                     {invoiceData.items && invoiceData.items.length > 0 ? (
                        invoiceData.items.map((item, idx) => (
                           <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 px-6 font-medium text-slate-700">{item.description}</td>
                              <td className="p-4 font-bold text-slate-600">{item.quantity}</td>
                              <td className="p-4 font-medium text-slate-600">{item.price}</td>
                              <td className="p-4 px-6 font-black text-slate-800 text-right">{item.total}</td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                              No specific line items found in this invoice.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
             </div>
          </div>

          <button onClick={() => { setFile(null); setInvoiceData(null); setApiError(''); }} className="mx-auto w-full max-w-md py-4 font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-2xl transition-all">
             Extract Another Invoice
          </button>

        </div>
      )}

    </div>
  );
}