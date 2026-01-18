import React, { useState } from 'react';
import {
  ClipboardList,
  Download,
  FileSpreadsheet,
  Copy,
  Zap,
  Cable,
  Battery,
  Check,
  AlertCircle
} from 'lucide-react';
import { BOMData } from '../types';
import { downloadBOMAsCSV, copySkusToClipboard } from '../utils/bomCalculator';
import { FIXTURE_TYPE_NAMES } from '../constants';

interface BOMViewProps {
  bomData: BOMData | null;
}

export const BOMView: React.FC<BOMViewProps> = ({ bomData }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!bomData) {
    return (
      <div className="h-full overflow-y-auto bg-[#050505] relative">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="flex flex-col items-center justify-center h-[60vh] border border-dashed border-white/10 rounded-3xl bg-[#111]/50 backdrop-blur-sm">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <ClipboardList className="w-8 h-8 text-gray-500" />
            </div>
            <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">No BOM Generated</p>
            <p className="text-xs text-gray-400 font-mono uppercase tracking-widest text-center max-w-sm">
              Generate a quote first, then click "Generate BOM" to create a Bill of Materials
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadCSV = () => {
    downloadBOMAsCSV(bomData);
  };

  const handleCopySKUs = async () => {
    const success = await copySkusToClipboard(bomData);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('bom-content');
    if (!element) return;

    setIsGeneratingPdf(true);
    element.classList.add('pdf-mode');

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `BOM_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      if ((window as any).html2pdf) {
        await (window as any).html2pdf().set(opt).from(element).save();
      } else {
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

  const generatedDate = new Date(bomData.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const hasSkus = bomData.fixtures.some(f => f.sku);

  return (
    <div className="h-full overflow-y-auto bg-[#050505] relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[500px] bg-[#F6B45A]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111]/90 backdrop-blur-xl p-3 md:p-4 rounded-xl border border-white/10 shadow-2xl mb-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F6B45A]/10 rounded-lg border border-[#F6B45A]/20">
              <ClipboardList className="w-5 h-5 text-[#F6B45A]" />
            </div>
            <div>
              <h2 className="text-sm md:text-lg font-bold text-white tracking-wide font-serif">
                BILL OF <span className="text-[#F6B45A]">MATERIALS</span>
              </h2>
              <p className="text-[10px] text-gray-400 font-mono">{generatedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {hasSkus && (
              <button
                onClick={handleCopySKUs}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Copy SKUs"
              >
                {copySuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleDownloadCSV}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors border border-white/10 disabled:opacity-50"
              title="Download PDF"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* BOM Content */}
        <div id="bom-content" className="bg-[#0F0F0F] rounded-xl md:rounded-[24px] shadow-2xl border border-white/5 p-4 md:p-8 print:bg-white print:text-black print:shadow-none print:border-none">

          {/* Header */}
          <div className="mb-8 pb-6 border-b border-white/10 print:border-gray-200">
            <h1 className="text-2xl md:text-3xl font-bold text-[#F6B45A] font-serif mb-2 print:text-black">
              Bill of Materials
            </h1>
            <p className="text-sm text-gray-400 print:text-gray-600">
              Generated: {generatedDate}
            </p>
          </div>

          {/* Fixtures Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#F6B45A] print:text-gray-800">
                Fixtures
              </h3>
              <span className="text-xs text-gray-400 font-mono print:text-gray-600">
                Total: {bomData.totalFixtures} units
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 print:border-gray-200">
                    <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-600">Type</th>
                    <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center print:text-gray-600">Qty</th>
                    <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center print:text-gray-600">W/Unit</th>
                    <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right print:text-gray-600">Total W</th>
                    {hasSkus && (
                      <>
                        <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-600">Brand</th>
                        <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-600">SKU</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {bomData.fixtures.map((fixture, index) => (
                    <tr
                      key={index}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors print:border-gray-100"
                    >
                      <td className="py-4 text-sm text-white font-medium print:text-black">
                        {FIXTURE_TYPE_NAMES[fixture.category] || fixture.name}
                      </td>
                      <td className="py-4 text-sm text-[#F6B45A] font-bold text-center print:text-black">
                        {fixture.quantity}
                      </td>
                      <td className="py-4 text-sm text-gray-300 text-center print:text-gray-600">
                        {fixture.wattage}W
                      </td>
                      <td className="py-4 text-sm text-white font-bold text-right print:text-black">
                        {fixture.totalWattage}W
                      </td>
                      {hasSkus && (
                        <>
                          <td className="py-4 text-sm text-gray-300 print:text-gray-600">
                            {fixture.brand || '-'}
                          </td>
                          <td className="py-4 text-sm text-gray-300 font-mono print:text-gray-600">
                            {fixture.sku || '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Power Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Total Wattage */}
            <div className="bg-[#111] rounded-xl p-5 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#F6B45A]/10 rounded-lg">
                  <Zap className="w-4 h-4 text-[#F6B45A]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-600">
                  Total Wattage
                </span>
              </div>
              <p className="text-3xl font-bold text-white print:text-black">
                {bomData.totalWattage}<span className="text-lg text-gray-400 ml-1">W</span>
              </p>
            </div>

            {/* Transformer */}
            <div className="bg-[#111] rounded-xl p-5 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#F6B45A]/10 rounded-lg">
                  <Battery className="w-4 h-4 text-[#F6B45A]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-600">
                  Transformer
                </span>
              </div>
              <p className="text-xl font-bold text-white print:text-black">
                {bomData.recommendedTransformer.name}
              </p>
              <p className="text-xs text-gray-400 mt-1 print:text-gray-600">
                {bomData.recommendedTransformer.loadPercentage}% load capacity
              </p>
            </div>

            {/* Wire Estimate */}
            <div className="bg-[#111] rounded-xl p-5 border border-white/5 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#F6B45A]/10 rounded-lg">
                  <Cable className="w-4 h-4 text-[#F6B45A]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-600">
                  Wire Estimate
                </span>
              </div>
              <p className="text-xl font-bold text-white print:text-black">
                {bomData.wireEstimate.footage}<span className="text-sm text-gray-400 ml-1">ft</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 print:text-gray-600">
                {bomData.wireEstimate.gauge} • {bomData.wireEstimate.runsNeeded} home run{bomData.wireEstimate.runsNeeded > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Note */}
          {!hasSkus && (
            <div className="flex items-start gap-3 bg-[#F6B45A]/10 border border-[#F6B45A]/20 rounded-xl p-4 print:hidden">
              <AlertCircle className="w-5 h-5 text-[#F6B45A] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium mb-1">No SKUs configured</p>
                <p className="text-xs text-gray-300">
                  Go to Settings → Fixture Catalog to add your preferred brands and SKUs for each fixture type.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
