import React, { useState } from 'react';
import { Mail, Download, Calendar, User, MapPin, Plus, Trash2, Percent, Save, Phone, MinusCircle, FileText, Loader2 } from 'lucide-react';
import { DEFAULT_PRICING } from '../constants';
import { LineItem, QuoteData, CompanyProfile, FixturePricing } from '../types';

interface QuoteViewProps {
    onSave: (data: QuoteData) => void;
    initialData?: QuoteData | null;
    companyProfile?: CompanyProfile;
    defaultPricing?: FixturePricing[];
    containerId?: string;
    hideToolbar?: boolean;
}

export const QuoteView: React.FC<QuoteViewProps> = ({ 
    onSave, 
    initialData, 
    companyProfile = { name: 'Omnia Light Scape Pro', email: '', address: '123 Landscape Lane\nDesign District, CA 90210', logo: null },
    defaultPricing = DEFAULT_PRICING,
    containerId = "quote-content",
    hideToolbar = false
}) => {
  // Helper to find pricing by type
  const getPrice = (type: string) => defaultPricing.find(p => p.fixtureType === type) || DEFAULT_PRICING.find(p => p.fixtureType === type)!;

  // Line Items State
  const [lineItems, setLineItems] = useState<LineItem[]>(initialData?.lineItems || [
    { ...getPrice('up'), quantity: 12 }, 
    { ...getPrice('path'), quantity: 6 },
    { ...getPrice('gutter'), quantity: 4 }, 
    { ...getPrice('soffit'), quantity: 4 },  
    { ...getPrice('hardscape'), quantity: 8 },  
    { ...getPrice('transformer'), quantity: 1 }, 
  ]);

  const [taxRate, setTaxRate] = useState<number>(initialData?.taxRate ?? 0.07);
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Client Details State (Controlled)
  const [clientName, setClientName] = useState(initialData?.clientDetails.name || "John & Jane Smith");
  const [clientEmail, setClientEmail] = useState(initialData?.clientDetails.email || "john.smith@example.com");
  const [clientPhone, setClientPhone] = useState(initialData?.clientDetails.phone || "(555) 123-4567");
  const [projectAddress, setProjectAddress] = useState(initialData?.clientDetails.address || "5500 Oak Hollow Drive\nBeverly Hills, CA 90210");
  
  const handleUpdateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `custom_${Date.now()}`,
      name: "New Custom Item",
      description: "Description of services...",
      quantity: 1,
      unitPrice: 0.00
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems);
  };

  const subtotal = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  // Calculate taxable amount (subtotal - discount), ensuring it doesn't go below zero
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;
  
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleSaveClick = () => {
      const data: QuoteData = {
          lineItems,
          taxRate,
          discount,
          clientDetails: {
              name: clientName,
              email: clientEmail,
              phone: clientPhone,
              address: projectAddress
          },
          total
      };
      onSave(data);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById(containerId);
    if (!element) return;

    setIsGeneratingPdf(true);

    // Apply specific class to container to force "Light Mode" styles defined in index.html
    element.classList.add('pdf-mode');

    const opt = {
        margin: [0.3, 0.3, 0.3, 0.3], // top, left, bottom, right in inches
        filename: `Omnia_Quote_${clientName.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        // html2pdf is loaded via CDN in index.html, so we access it via window
        if ((window as any).html2pdf) {
            await (window as any).html2pdf().set(opt).from(element).save();
        } else {
            console.error("html2pdf library not loaded");
            alert("PDF generation library not loaded. Please refresh.");
        }
    } catch (e) {
        console.error("PDF Generation failed:", e);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        element.classList.remove('pdf-mode');
        setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] p-2 md:p-8 overflow-y-auto relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[500px] bg-[#F6B45A]/5 blur-[120px] rounded-full pointer-events-none print:hidden ambient-glow"></div>

      <div className="max-w-4xl mx-auto w-full space-y-4 md:space-y-6 relative z-10">
        
        {/* Toolbar */}
        {!hideToolbar && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111]/90 backdrop-blur-xl p-3 md:p-4 rounded-xl border border-white/10 shadow-2xl print:hidden sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-[#F6B45A]/10 rounded-lg border border-[#F6B45A]/20">
                    <FileText className="w-5 h-5 text-[#F6B45A]" />
                </div>
                <h2 className="text-sm md:text-lg font-bold text-white tracking-wide font-serif">QUOTE <span className="text-[#F6B45A]">GENERATOR</span></h2>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
                <button 
                    onClick={handleSaveClick}
                    className="bg-[#F6B45A] text-[#111] px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#ffc67a] hover:scale-105 transition-all shadow-[0_0_15px_rgba(246,180,90,0.3)]"
                >
                    <Save className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Save Project</span>
                    <span className="sm:hidden">Save</span>
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                {/* Email Button */}
                <button className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Email">
                    <Mail className="w-4 h-4" />
                </button>
                {/* Download PDF Button */}
                <button 
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download PDF"
                >
                    {isGeneratingPdf ? (
                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                    ) : (
                        <Download className="w-3 h-3 md:w-4 md:h-4" />
                    )}
                    <span className="hidden sm:inline">{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
                </button>
            </div>
            </div>
        )}

        {/* Paper Document / Digital Datapad */}
        <div id={containerId} className="bg-[#0F0F0F] rounded-xl md:rounded-[24px] shadow-2xl border border-white/5 min-h-auto md:min-h-[1000px] p-4 md:p-12 relative print:shadow-none print:border-none print:m-0 print:w-full print:bg-white print:text-black">
          
          {/* Header */}
          <header className="mb-8 md:mb-12 border-b border-white/10 pb-6 print:border-gray-200">
             <div className="flex justify-between items-start">
                 <div className="w-full">
                    {/* Company Name & Logo Row */}
                    <div className="flex items-center gap-6 mb-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-[#F6B45A] tracking-tight font-serif print:text-[#111]">
                             {companyProfile.name}
                        </h1>
                        {companyProfile.logo && (
                            <img src={companyProfile.logo} alt="Logo" className="h-16 w-16 md:h-24 md:w-24 object-contain" />
                        )}
                    </div>
                    {/* Address & Date */}
                    <div className="text-xs md:text-sm text-gray-200 space-y-0.5 md:space-y-1 whitespace-pre-line print:text-gray-600">
                        {companyProfile.address}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                        <span className="font-bold text-[#F6B45A] uppercase tracking-wider text-xs flex items-center gap-1 print:text-gray-800"><Calendar className="w-3 h-3"/> Date:</span>
                        <span className="text-xs md:text-sm font-medium text-white print:text-black">{today}</span>
                    </div>
                 </div>
             </div>
          </header>

          {/* Client & Project Info */}
          <div className="grid grid-cols-2 gap-4 md:gap-12 mb-8 md:mb-12">
             <div className="bg-[#111]/50 p-4 rounded-xl border border-white/5 print:border-none print:p-0 print:bg-transparent">
                <h3 className="text-[10px] md:text-xs font-bold text-[#F6B45A] uppercase tracking-[0.2em] mb-3 md:mb-4 border-b border-white/10 pb-2 print:text-gray-800 print:border-gray-200">Quote For</h3>
                <div className="text-gray-200 text-sm space-y-2 print:text-black">
                    <div className="flex items-center gap-3 text-gray-300 pt-1">
                        <User className="w-3 h-3 md:w-4 md:h-4 shrink-0 text-[#F6B45A] print:text-gray-400" />
                        <input 
                            type="text" 
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full border-b border-white/10 focus:border-[#F6B45A] focus:ring-0 p-1 text-base font-bold text-white bg-transparent placeholder-gray-400 min-w-0 transition-colors print:text-black print:border-none print:p-0" 
                            placeholder="Client Name"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                        <Mail className="w-3 h-3 md:w-4 md:h-4 shrink-0 text-gray-300 print:text-gray-400" />
                         <input 
                            type="text" 
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full border-b border-white/10 focus:border-[#F6B45A] focus:ring-0 p-1 text-xs md:text-sm text-gray-200 bg-transparent placeholder-gray-400 min-w-0 transition-colors print:text-black print:border-none print:p-0" 
                            placeholder="Client Email"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                        <Phone className="w-3 h-3 md:w-4 md:h-4 shrink-0 text-gray-300 print:text-gray-400" />
                         <input 
                            type="text" 
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="w-full border-b border-white/10 focus:border-[#F6B45A] focus:ring-0 p-1 text-xs md:text-sm text-gray-200 bg-transparent placeholder-gray-400 min-w-0 transition-colors print:text-black print:border-none print:p-0" 
                            placeholder="Cell Phone"
                        />
                    </div>
                </div>
             </div>
             <div className="bg-[#111]/50 p-4 rounded-xl border border-white/5 print:border-none print:p-0 print:bg-transparent">
                <h3 className="text-[10px] md:text-xs font-bold text-[#F6B45A] uppercase tracking-[0.2em] mb-3 md:mb-4 border-b border-white/10 pb-2 print:text-gray-800 print:border-gray-200">Project Site</h3>
                <div className="text-gray-200 text-sm space-y-1 print:text-black">
                    <div className="flex items-start gap-3 text-gray-300 pt-1">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 mt-1.5 shrink-0 text-[#F6B45A] print:text-gray-400" />
                        <textarea 
                            className="w-full border-none focus:ring-0 p-1 text-xs md:text-sm text-gray-200 resize-none h-20 bg-transparent placeholder-gray-400 leading-relaxed print:text-black print:p-0"
                            value={projectAddress}
                            onChange={(e) => setProjectAddress(e.target.value)}
                            placeholder="Project Address"
                        />
                    </div>
                </div>
             </div>
          </div>

          {/* Line Items - DESKTOP TABLE */}
          <div className="hidden md:block mb-8">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 print:border-black">
                        <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 w-[50%] print:text-black">Description</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 text-center w-[10%] print:text-black">Qty</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 text-right w-[15%] print:text-black">Rate</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 text-right w-[15%] print:text-black">Amount</th>
                        <th className="py-4 w-[5%] print:hidden"></th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {lineItems.map((item, index) => (
                        <tr key={index} className="border-b border-white/5 group hover:bg-white/5 transition-colors print:border-gray-200">
                            <td className="py-4 pr-4 align-top">
                                <input 
                                    type="text" 
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                                    className="font-bold text-white mb-1 w-full bg-transparent border-none p-0 focus:ring-0 rounded px-1 -ml-1 print:text-black"
                                />
                                <textarea 
                                    value={item.description}
                                    onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                    className="text-gray-300 text-xs whitespace-pre-line leading-relaxed w-full bg-transparent border-none p-0 focus:ring-0 rounded px-1 -ml-1 resize-y min-h-[40px] font-mono print:text-gray-600"
                                    rows={2}
                                />
                            </td>
                            <td className="py-4 text-center align-top">
                                <input 
                                    type="number" 
                                    value={item.quantity}
                                    min="0"
                                    onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-16 text-center font-bold text-[#F6B45A] bg-[#111] border border-white/10 focus:border-[#F6B45A] rounded p-1 print:text-black print:bg-transparent print:border-none"
                                />
                            </td>
                            <td className="py-4 text-right align-top">
                                <div className="flex items-center justify-end gap-1">
                                    <span className="text-gray-400 text-xs font-mono">$</span>
                                    <input 
                                        type="number" 
                                        value={item.unitPrice}
                                        min="0"
                                        step="0.01"
                                        onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        className="w-20 text-right font-medium text-gray-200 bg-transparent border-none p-0 focus:ring-0 rounded font-mono print:text-black"
                                    />
                                </div>
                            </td>
                            <td className="py-4 text-right font-bold text-white align-top pt-5 font-mono print:text-black">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                            </td>
                            <td className="py-4 text-right align-top print:hidden">
                                <button 
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          {/* Line Items - MOBILE CARDS */}
          <div className="md:hidden space-y-4 mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300 border-b border-white/10 pb-2">Line Items</h3>
            {lineItems.map((item, index) => (
                <div key={index} className="bg-[#111] border border-white/10 rounded-xl p-4 shadow-lg relative print:bg-transparent print:border-gray-200">
                    {/* Remove Button */}
                    <button 
                        onClick={() => handleRemoveItem(index)}
                        className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors print:hidden"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Name & Desc */}
                    <div className="pr-8 mb-4">
                        <input 
                            type="text" 
                            value={item.name}
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            className="font-bold text-white text-sm mb-1 w-full bg-transparent border-none p-0 focus:ring-0 placeholder-gray-400 print:text-black"
                            placeholder="Item Name"
                        />
                        <textarea 
                            value={item.description}
                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                            className="text-gray-300 text-xs w-full bg-transparent border-none p-0 focus:ring-0 resize-none min-h-[40px] font-mono print:text-gray-600"
                            rows={2}
                            placeholder="Description"
                        />
                    </div>

                    {/* Controls Grid */}
                    <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
                        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-white/5 print:bg-transparent print:border-gray-100">
                            <label className="text-[9px] font-bold uppercase text-gray-300 block mb-1">Qty</label>
                            <input 
                                type="number" 
                                value={item.quantity}
                                min="0"
                                onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full text-sm font-bold text-[#F6B45A] bg-transparent border-none p-0 focus:ring-0 print:text-black"
                            />
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-white/5 print:bg-transparent print:border-gray-100">
                            <label className="text-[9px] font-bold uppercase text-gray-300 block mb-1">Rate</label>
                            <div className="flex items-center">
                                <span className="text-[10px] text-gray-400 mr-0.5">$</span>
                                <input 
                                    type="number" 
                                    value={item.unitPrice}
                                    step="0.01"
                                    onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full text-sm font-bold text-gray-200 bg-transparent border-none p-0 focus:ring-0 font-mono print:text-black"
                                />
                            </div>
                        </div>
                        <div className="bg-[#F6B45A]/10 rounded-lg p-2 border border-[#F6B45A]/20 flex flex-col justify-center items-end print:bg-gray-100 print:border-gray-200">
                            <label className="text-[9px] font-bold uppercase text-[#F6B45A] block mb-0.5 print:text-gray-600">Total</label>
                            <span className="text-sm font-black text-white font-mono print:text-black">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
          </div>

          {/* Add Item Button */}
          {!hideToolbar && (
            <div className="mb-12 print:hidden">
                <button 
                    onClick={handleAddItem}
                    className="w-full md:w-auto flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F6B45A] hover:text-[#e5a040] hover:bg-[#F6B45A]/10 px-6 py-3 rounded-xl border border-dashed border-[#F6B45A]/30 hover:border-[#F6B45A] transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    ADD ITEM
                </button>
            </div>
          )}

          {/* Totals */}
          <div className="flex flex-col md:items-end gap-3 mb-12 md:mb-16 bg-[#111]/30 p-6 rounded-2xl border border-white/5 print:bg-transparent print:border-none print:p-0">
             <div className="w-full md:w-1/2 flex justify-between py-2 text-sm text-gray-200 print:text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium font-mono text-white print:text-black">${subtotal.toFixed(2)}</span>
             </div>
             
             {/* Discount Row */}
             <div className="w-full md:w-1/2 flex justify-between items-center py-2 text-sm text-gray-200 print:text-gray-600">
                <span className="flex items-center gap-2 text-white font-medium print:text-black"><MinusCircle className="w-3 h-3 text-red-400" /> Discount</span>
                <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">-$</span>
                    <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 text-sm text-red-400 focus:ring-0 focus:border-red-400 font-bold placeholder-red-800 font-mono print:bg-transparent print:border-gray-200 print:text-red-600"
                        min="0"
                        placeholder="0.00"
                    />
                </div>
             </div>

             <div className="w-full md:w-1/2 flex justify-between items-center py-2 text-sm text-gray-200 border-b border-white/10 print:border-gray-200 print:text-gray-600">
                <div className="flex items-center gap-2">
                    <span>Tax Rate</span>
                    <div className="flex items-center bg-[#1a1a1a] rounded px-2 py-1 border border-white/5 print:bg-gray-50 print:border-none">
                        <input 
                            type="number"
                            value={(taxRate * 100).toFixed(1)}
                            onChange={(e) => setTaxRate((parseFloat(e.target.value) || 0) / 100)}
                            className="w-10 text-right bg-transparent border-none p-0 text-xs focus:ring-0 font-medium text-gray-200 print:text-black"
                            step="0.1"
                        />
                        <Percent className="w-3 h-3 ml-0.5 text-gray-400" />
                    </div>
                </div>
                <span className="font-medium font-mono text-white print:text-black">${tax.toFixed(2)}</span>
             </div>
             <div className="w-full md:w-1/2 flex justify-between py-4 text-2xl font-serif font-bold text-[#F6B45A] print:text-black">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
             </div>
          </div>

          {/* Footer / Terms */}
          <div className="mt-auto pt-8 border-t border-white/10 print:border-gray-200">
             <h4 className="text-xs font-bold uppercase tracking-wider text-[#F6B45A] mb-3 print:text-gray-800">Terms & Conditions</h4>
             <textarea 
                className="w-full text-[10px] text-gray-300 leading-relaxed max-w-2xl mb-8 md:mb-12 border-none resize-none bg-transparent focus:bg-[#111] p-2 rounded focus:ring-0 min-h-[80px] print:text-gray-600"
                defaultValue="This estimate is valid for 30 days. A 50% deposit is required to schedule installation. The remaining balance is due upon completion of the project. Any changes to this scope of work must be approved in writing and may result in additional charges. Lifetime warranty on fixtures covers manufacturer defects; labor warranty is valid for 2 years from installation date."
             />

             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 md:gap-12">
                <div className="w-full md:flex-1 border-b border-white/20 pb-2 print:border-gray-300">
                    <p className="text-xs text-gray-300 uppercase tracking-widest mb-8 md:mb-8 mt-4 md:mt-0 print:text-gray-400">Authorized Signature</p>
                </div>
                <div className="w-full md:flex-1 border-b border-white/20 pb-2 print:border-gray-300">
                     <p className="text-xs text-gray-300 uppercase tracking-widest mb-8 md:mb-8 mt-4 md:mt-0 print:text-gray-400">Date</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};