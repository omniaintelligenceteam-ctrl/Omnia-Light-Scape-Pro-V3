import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { Package, AlertTriangle, RefreshCw, Plus, X, Trash2 } from 'lucide-react';
import { getInventory, InventoryItem } from '../services/inventoryService';

// Animated counter component for number animations
const AnimatedCounter: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const duration = 800;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);

            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
        previousValue.current = value;
    }, [value]);

    return <span className={className}>{displayValue}</span>;
};

// Multi-layer hover card component
const MultiLayerCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    isLocal?: boolean;
}> = ({ children, className, isLocal }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useTransform(y, [-100, 100], [8, -8]);
    const rotateY = useTransform(x, [-100, 100], [-8, 8]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(e.clientX - centerX);
        y.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            className={className}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{
                scale: 1.02,
                boxShadow: isLocal
                    ? '0 25px 50px -12px rgba(246, 180, 90, 0.25), 0 0 30px rgba(246, 180, 90, 0.1)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 255, 255, 0.05)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {children}
        </motion.div>
    );
};

export const InventoryView: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [localInventory, setLocalInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({
        sku: '',
        name: '',
        on_hand: 0,
        reserved: 0
    });

    const fetchInventory = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getInventory();
            setInventory(data);
        } catch (err) {
            setError('Failed to load inventory. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // Combine API inventory with local inventory
    const allInventory = [...inventory, ...localInventory];

    const handleAddProduct = () => {
        if (!newProduct.name.trim() || !newProduct.sku.trim()) return;

        const newItem: InventoryItem = {
            sku: newProduct.sku,
            name: newProduct.name,
            on_hand: newProduct.on_hand,
            reserved: newProduct.reserved
        };

        setLocalInventory(prev => [...prev, newItem]);
        setNewProduct({ sku: '', name: '', on_hand: 0, reserved: 0 });
        setShowAddProduct(false);
    };

    const handleDeleteLocalProduct = (sku: string) => {
        setLocalInventory(prev => prev.filter(item => item.sku !== sku));
    };

    const isLocalItem = (sku: string) => localInventory.some(item => item.sku === sku);

    const getStockStatus = (item: InventoryItem) => {
        const available = item.on_hand - item.reserved;
        if (available <= 0) return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Out of Stock' };
        if (available <= 10) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Low Stock' };
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'In Stock' };
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#F6B45A]/10 rounded-lg border border-[#F6B45A]/20">
                        <Package className="w-5 h-5 text-[#F6B45A]" />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide font-serif">
                        INVENTORY <span className="gradient-text-animated">DASHBOARD</span>
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddProduct(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F6B45A] text-black rounded-lg text-sm font-bold hover:bg-[#ffc67a] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                    <button
                        onClick={fetchInventory}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:border-[#F6B45A]/50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-400 text-sm">{typeof error === 'string' ? error : 'An error occurred'}</span>
                </div>
            )}

            {/* Inventory Grid with Staggered Animations */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.08,
                            delayChildren: 0.1,
                        },
                    },
                }}
            >
                <AnimatePresence mode="popLayout">
                    {allInventory.map((item, index) => {
                        const status = getStockStatus(item);
                        const available = item.on_hand - item.reserved;
                        const isLocal = isLocalItem(item.sku);

                        return (
                            <motion.div
                                key={item.sku}
                                layout
                                variants={{
                                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            type: 'spring',
                                            stiffness: 300,
                                            damping: 24,
                                        },
                                    },
                                }}
                                initial="hidden"
                                animate="visible"
                                exit={{
                                    opacity: 0,
                                    scale: 0.8,
                                    y: -20,
                                    transition: { duration: 0.3, ease: 'easeOut' },
                                }}
                            >
                                <MultiLayerCard
                                    isLocal={isLocal}
                                    className={`bg-[#111] border rounded-xl p-4 hover:border-[#F6B45A]/30 transition-colors group relative cursor-pointer ${isLocal ? 'border-[#F6B45A]/20' : 'border-white/10'}`}
                                >
                                    {/* Delete button for local items */}
                                    {isLocal && (
                                        <motion.button
                                            onClick={() => handleDeleteLocalProduct(item.sku)}
                                            className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                            title="Remove product"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </motion.button>
                                    )}

                                    {/* SKU & Status */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-500">{item.sku}</span>
                                            {isLocal && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="text-[8px] px-1.5 py-0.5 rounded bg-[#F6B45A]/20 text-[#F6B45A] font-bold uppercase"
                                                >
                                                    Local
                                                </motion.span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${status.bg} ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    {/* Name */}
                                    <h3 className="text-white font-semibold mb-4">{item.name}</h3>

                                    {/* Stock Numbers with Animated Counters */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-[#0a0a0a] rounded-lg p-2">
                                            <div className="text-xs text-gray-500 mb-1">On Hand</div>
                                            <AnimatedCounter value={item.on_hand} className="text-lg font-bold text-white" />
                                        </div>
                                        <div className="bg-[#0a0a0a] rounded-lg p-2">
                                            <div className="text-xs text-gray-500 mb-1">Reserved</div>
                                            <AnimatedCounter value={item.reserved} className="text-lg font-bold text-amber-500" />
                                        </div>
                                        <div className={`rounded-lg p-2 ${status.bg}`}>
                                            <div className="text-xs text-gray-500 mb-1">Available</div>
                                            <AnimatedCounter value={available} className={`text-lg font-bold ${status.color}`} />
                                        </div>
                                    </div>
                                </MultiLayerCard>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* Empty State */}
            {!loading && inventory.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Package className="w-12 h-12 mb-4 opacity-50" />
                    <p>No inventory data available</p>
                    <p className="text-sm mt-1">Start the backend: <code className="text-[#F6B45A]">cd backend && npm run dev</code></p>
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && inventory.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-[#111] border border-white/10 rounded-xl p-4 animate-pulse">
                            <div className="h-4 bg-white/5 rounded w-1/3 mb-3"></div>
                            <div className="h-5 bg-white/10 rounded w-2/3 mb-4"></div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="h-14 bg-white/5 rounded"></div>
                                <div className="h-14 bg-white/5 rounded"></div>
                                <div className="h-14 bg-white/5 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Product Modal */}
            {showAddProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4 bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#F6B45A]/10 rounded-lg">
                                    <Plus className="w-4 h-4 text-[#F6B45A]" />
                                </div>
                                <h3 className="font-bold text-lg text-white font-serif">Add Inventory Item</h3>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">SKU *</label>
                                    <input
                                        type="text"
                                        value={newProduct.sku}
                                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                        placeholder="e.g., LT-001"
                                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:border-[#F6B45A] focus:outline-none transition-colors placeholder-gray-500"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Product Name *</label>
                                    <input
                                        type="text"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        placeholder="e.g., Up Light Bronze"
                                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors placeholder-gray-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">On Hand</label>
                                    <input
                                        type="number"
                                        value={newProduct.on_hand}
                                        onChange={(e) => setNewProduct({ ...newProduct, on_hand: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Reserved</label>
                                    <input
                                        type="number"
                                        value={newProduct.reserved}
                                        onChange={(e) => setNewProduct({ ...newProduct, reserved: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F6B45A] focus:outline-none transition-colors"
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
                                disabled={!newProduct.name.trim() || !newProduct.sku.trim()}
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

export default InventoryView;