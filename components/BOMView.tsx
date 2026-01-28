import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Download,
  FileSpreadsheet,
  Copy,
  Zap,
  Cable,
  Battery,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { BOMData, BOMFixture, QuoteData } from '../types';
import { downloadBOMAsCSV, copySkusToClipboard } from '../utils/bomCalculator';
import { FIXTURE_TYPE_NAMES, DEFAULT_FIXTURE_WATTAGES } from '../constants';

interface BOMViewProps {
  bomData: BOMData | null;
  onBOMChange?: (bom: BOMData) => void;
  onSaveProject?: (bom: BOMData) => void;
  currentQuote?: QuoteData | null;
  generatedImage?: string | null;
}

export const BOMView: React.FC<BOMViewProps> = ({
  bomData,
  onBOMChange,
  onSaveProject,
  currentQuote: _currentQuote,
  generatedImage: _generatedImage
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [localBOM, setLocalBOM] = useState<BOMData | null>(bomData);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'up',
    quantity: 1,
    wattage: 4,
    brand: '',
    sku: ''
  });

  // Sync local state with prop changes
  useEffect(() => {
    setLocalBOM(bomData);
  }, [bomData]);

  // Recalculate totals when fixtures change
  const recalculateBOM = (fixtures: BOMFixture[]): BOMData => {
    const totalWattage = fixtures.reduce((sum, f) => sum + f.totalWattage, 0);
    const totalFixtures = fixtures.reduce((sum, f) => sum + f.quantity, 0);

    // Recalculate transformer recommendation (80% rule)
    const minTransformerSize = totalWattage / 0.8;
    const TRANSFORMER_SIZES = [
      { watts: 150, name: '150W Transformer' },
      { watts: 300, name: '300W Transformer' },
      { watts: 600, name: '600W Transformer' },
      { watts: 900, name: '900W Transformer' },
      { watts: 1200, name: '1200W Transformer' }
    ];

    let recommendedTransformer = TRANSFORMER_SIZES[TRANSFORMER_SIZES.length - 1];
    for (const t of TRANSFORMER_SIZES) {
      if (t.watts >= minTransformerSize) {
        recommendedTransformer = t;
        break;
      }
    }
    const loadPercentage = Math.round((totalWattage / recommendedTransformer.watts) * 100);

    // Recalculate wire estimate
    const baseFootage = 150;
    const additionalPerFixture = 25;
    const footage = baseFootage + Math.max(0, totalFixtures - 10) * additionalPerFixture;
    const gauge = footage > 300 ? '10/2' : '12/2';
    const runsNeeded = Math.max(1, Math.ceil(totalFixtures / 12));

    return {
      fixtures,
      totalWattage,
      totalFixtures,
      recommendedTransformer: {
        name: recommendedTransformer.name,
        watts: recommendedTransformer.watts,
        loadPercentage
      },
      wireEstimate: { gauge, footage, runsNeeded },
      generatedAt: localBOM?.generatedAt || new Date().toISOString()
    };
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (!localBOM) return;
    const qty = Math.max(0, newQuantity);
    const updatedFixtures = localBOM.fixtures.map((f, i) => {
      if (i === index) {
        return { ...f, quantity: qty, totalWattage: qty * f.wattage };
      }
      return f;
    }).filter(f => f.quantity > 0);

    const newBOM = recalculateBOM(updatedFixtures);
    setLocalBOM(newBOM);
    onBOMChange?.(newBOM);
  };

  const handleWattageChange = (index: number, newWattage: number) => {
    if (!localBOM) return;
    const watt = Math.max(1, newWattage);
    const updatedFixtures = localBOM.fixtures.map((f, i) => {
      if (i === index) {
        return { ...f, wattage: watt, totalWattage: f.quantity * watt };
      }
      return f;
    });

    const newBOM = recalculateBOM(updatedFixtures);
    setLocalBOM(newBOM);
    onBOMChange?.(newBOM);
  };

  const handleDeleteFixture = (index: number) => {
    if (!localBOM) return;
    const updatedFixtures = localBOM.fixtures.filter((_, i) => i !== index);
    const newBOM = recalculateBOM(updatedFixtures);
    setLocalBOM(newBOM);
    onBOMChange?.(newBOM);
  };

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) return;

    const newFixture: BOMFixture = {
      id: `custom_${Date.now()}`,
      category: newProduct.category,
      name: newProduct.name,
      quantity: newProduct.quantity,
      wattage: newProduct.wattage,
      totalWattage: newProduct.quantity * newProduct.wattage,
      brand: newProduct.brand || undefined,
      sku: newProduct.sku || undefined
    };

    const currentFixtures = localBOM?.fixtures || [];
    const newBOM = recalculateBOM([...currentFixtures, newFixture]);
    setLocalBOM(newBOM);
    onBOMChange?.(newBOM);

    // Reset form
    setNewProduct({
      name: '',
      category: 'up',
      quantity: 1,
      wattage: 4,
      brand: '',
      sku: ''
    });
    setShowAddProduct(false);
  };

  const handleSaveProject = () => {
    if (localBOM && onSaveProject) {
      onSaveProject(localBOM);
    }
  };

  if (!localBOM) {
    return (
      <div className="h-full overflow-y-auto bg-[#050505] pb-24 md:pb-8 relative">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center h-[60vh] border border-dashed border-white/10 rounded-3xl bg-[#111]/50 backdrop-blur-sm"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-empty-glow-pulse"
            >
              <ClipboardList className="w-8 h-8 text-gray-500" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-bold text-lg text-white font-serif tracking-wide mb-2"
            >
              No BOM Generated
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-gray-400 font-mono uppercase tracking-widest text-center max-w-sm"
            >
              Generate a quote first, then click "Generate BOM" to create a Bill of Materials
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleDownloadCSV = () => {
    if (localBOM) downloadBOMAsCSV(localBOM);
  };

  const handleCopySKUs = async () => {
    if (!localBOM) return;
    const success = await copySkusToClipboard(localBOM);
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

  const generatedDate = new Date(localBOM.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const hasSkus = localBOM.fixtures.some(f => f.sku);
  const fixtureCategories = ['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill'];

  return (
    <div className="h-full overflow-y-auto bg-[#050505] pb-24 md:pb-8 relative">
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
            {onSaveProject && (
              <button
                onClick={handleSaveProject}
                className="bg-[#F6B45A] text-[#111] px-3 py-2 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#ffc67a] hover:scale-105 transition-all shadow-[0_0_15px_rgba(246,180,90,0.3)]"
              >
                <Save className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Save Project</span>
                <span className="sm:hidden">Save</span>
              </button>
            )}
            <button
              onClick={() => setShowAddProduct(true)}
              className="bg-white/10 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/20 transition-all border border-white/10"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </button>
            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
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
                Total: {localBOM.totalFixtures} units
              </span>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              <AnimatePresence mode="popLayout">
                {localBOM.fixtures.map((fixture, index) => (
                  <motion.div
                    key={fixture.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-[#111] rounded-xl border border-white/5 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-medium text-white">
                        {FIXTURE_TYPE_NAMES[fixture.category] || fixture.name}
                      </h4>
                      <button
                        onClick={() => handleDeleteFixture(index)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remove fixture"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Quantity</span>
                        <input
                          type="number"
                          value={fixture.quantity}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full bg-white/5 border border-white/10 focus:border-[#F6B45A] rounded-lg px-3 py-2 text-sm text-[#F6B45A] font-bold focus:outline-none transition-colors text-base"
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Wattage</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={fixture.wattage}
                            onChange={(e) => handleWattageChange(index, parseInt(e.target.value) || 1)}
                            min="1"
                            max="100"
                            className="w-full bg-white/5 border border-white/10 focus:border-[#F6B45A] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none transition-colors text-base"
                            inputMode="numeric"
                          />
                          <span className="text-gray-500 text-sm">W</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Total</span>
                      <span className="text-sm font-bold text-white">{fixture.totalWattage}W</span>
                    </div>
                    {hasSkus && (fixture.brand || fixture.sku) && (
                      <div className="mt-2 pt-2 border-t border-white/5 text-xs text-gray-400">
                        {fixture.brand && <span className="mr-3">{fixture.brand}</span>}
                        {fixture.sku && <span className="font-mono">{fixture.sku}</span>}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto print:block">
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
                    <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {localBOM.fixtures.map((fixture, index) => (
                      <motion.tr
                      key={fixture.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors print:border-gray-100 group"
                    >
                      <td className="py-4 text-sm text-white font-medium print:text-black">
                        {FIXTURE_TYPE_NAMES[fixture.category] || fixture.name}
                      </td>
                      <td className="py-4 text-center print:text-black">
                        <input
                          type="number"
                          value={fixture.quantity}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-16 bg-transparent border border-transparent hover:border-white/20 focus:border-[#F6B45A] rounded px-2 py-1 text-sm text-[#F6B45A] font-bold text-center focus:outline-none transition-colors print:border-none"
                        />
                      </td>
                      <td className="py-4 text-center print:text-gray-600">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={fixture.wattage}
                            onChange={(e) => handleWattageChange(index, parseInt(e.target.value) || 1)}
                            min="1"
                            max="100"
                            className="w-14 bg-transparent border border-transparent hover:border-white/20 focus:border-[#F6B45A] rounded px-2 py-1 text-sm text-gray-300 text-center focus:outline-none transition-colors print:border-none"
                          />
                          <span className="text-gray-500 text-sm">W</span>
                        </div>
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
                      <td className="py-4 text-center print:hidden">
                        <button
                          onClick={() => handleDeleteFixture(index)}
                          className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove fixture"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                  </AnimatePresence>
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
                {localBOM.totalWattage}<span className="text-lg text-gray-400 ml-1">W</span>
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
                {localBOM.recommendedTransformer.name}
              </p>
              <p className="text-xs text-gray-400 mt-1 print:text-gray-600">
                {localBOM.recommendedTransformer.loadPercentage}% load capacity
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
                {localBOM.wireEstimate.footage}<span className="text-sm text-gray-400 ml-1">ft</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 print:text-gray-600">
                {localBOM.wireEstimate.gauge} • {localBOM.wireEstimate.runsNeeded} home run{localBOM.wireEstimate.runsNeeded > 1 ? 's' : ''}
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

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg mx-4 bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#F6B45A]/10 rounded-lg">
                  <Plus className="w-4 h-4 text-[#F6B45A]" />
                </div>
                <h3 className="font-bold text-lg text-white font-serif">Add Product</h3>
              </div>
              <button
                onClick={() => setShowAddProduct(false)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Product Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., Custom LED Fixture"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors placeholder-gray-500"
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                  Category
                </label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value, wattage: DEFAULT_FIXTURE_WATTAGES[e.target.value] || 4 })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors"
                >
                  {fixtureCategories.map(cat => (
                    <option key={cat} value={cat} className="bg-[#1a1a1a] text-white">{FIXTURE_TYPE_NAMES[cat] || cat}</option>
                  ))}
                  <option value="other" className="bg-[#1a1a1a] text-white">Other</option>
                </select>
              </div>

              {/* Quantity and Wattage Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    Wattage (per unit)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newProduct.wattage}
                      onChange={(e) => setNewProduct({ ...newProduct, wattage: Math.max(1, parseInt(e.target.value) || 1) })}
                      min="1"
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 pr-8 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">W</span>
                  </div>
                </div>
              </div>

              {/* Brand and SKU Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    Brand (optional)
                  </label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    placeholder="e.g., FX Luminaire"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    SKU (optional)
                  </label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="e.g., PO-1LED-BZ"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:border-[#F6B45A] focus:outline-none transition-colors placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-[#0a0a0a]">
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!newProduct.name.trim()}
                className="px-6 py-2 bg-[#F6B45A] text-[#111] rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-[#ffc67a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
