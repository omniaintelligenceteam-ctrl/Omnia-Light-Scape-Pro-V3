import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { getInventory, InventoryItem } from '../services/inventoryService';

export const InventoryView: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const getStockStatus = (item: InventoryItem) => {
        const available = item.on_hand - item.reserved;
        if (available <= 0) return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Out of Stock' };
        if (available <= 10) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Low Stock' };
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'In Stock' };
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] p-4 md:p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#F6B45A]/10 rounded-lg border border-[#F6B45A]/20">
                        <Package className="w-5 h-5 text-[#F6B45A]" />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide font-serif">
                        INVENTORY <span className="text-[#F6B45A]">DASHBOARD</span>
                    </h2>
                </div>
                <button
                    onClick={fetchInventory}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:border-[#F6B45A]/50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-400 text-sm">{error}</span>
                </div>
            )}

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map((item) => {
                    const status = getStockStatus(item);
                    const available = item.on_hand - item.reserved;

                    return (
                        <div
                            key={item.sku}
                            className="bg-[#111] border border-white/10 rounded-xl p-4 hover:border-[#F6B45A]/30 transition-colors"
                        >
                            {/* SKU & Status */}
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-xs font-mono text-gray-500">{item.sku}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${status.bg} ${status.color}`}>
                                    {status.label}
                                </span>
                            </div>

                            {/* Name */}
                            <h3 className="text-white font-semibold mb-4">{item.name}</h3>

                            {/* Stock Numbers */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-[#0a0a0a] rounded-lg p-2">
                                    <div className="text-xs text-gray-500 mb-1">On Hand</div>
                                    <div className="text-lg font-bold text-white">{item.on_hand}</div>
                                </div>
                                <div className="bg-[#0a0a0a] rounded-lg p-2">
                                    <div className="text-xs text-gray-500 mb-1">Reserved</div>
                                    <div className="text-lg font-bold text-amber-500">{item.reserved}</div>
                                </div>
                                <div className={`rounded-lg p-2 ${status.bg}`}>
                                    <div className="text-xs text-gray-500 mb-1">Available</div>
                                    <div className={`text-lg font-bold ${status.color}`}>{available}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

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
        </div>
    );
};

export default InventoryView;