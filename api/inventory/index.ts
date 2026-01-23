import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase.js';

interface StockCheckItem {
    sku: string;
    quantity: number;
}

interface Shortage {
    sku: string;
    requested: number;
    available: number;
    deficit: number;
}

// Mock inventory for local dev without Supabase
const MOCK_INVENTORY = [
    { sku: 'BRASS-UP-3000K', name: 'Solid Cast Brass Up Light', on_hand: 50, reserved: 0 },
    { sku: 'BRASS-PATH-3000K', name: 'Cast Brass Path Light', on_hand: 30, reserved: 0 },
    { sku: 'CORE-DRILL-SS', name: 'Core Drill In-Grade Light', on_hand: 20, reserved: 0 },
    { sku: 'GUTTER-UP-3000K', name: 'Gutter Mounted Up Light', on_hand: 25, reserved: 0 },
    { sku: 'SOFFIT-DOWN', name: 'Recessed Soffit Downlight', on_hand: 40, reserved: 0 },
    { sku: 'HARDSCAPE-LINEAR', name: 'Hardscape Linear Light', on_hand: 35, reserved: 0 },
    { sku: 'TRANSFORMER-300W', name: 'Low Voltage Transformer', on_hand: 10, reserved: 0 },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // GET /api/inventory - List all inventory
        if (req.method === 'GET') {
            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('inventory')
                        .select('*')
                        .order('name');

                    if (!error && data) {
                        return res.json(data);
                    }
                }
            } catch (err) {
                console.error('Supabase inventory fetch error:', err);
            }

            // Fallback to mock data
            return res.json(MOCK_INVENTORY);
        }

        // POST /api/inventory (check stock)
        if (req.method === 'POST') {
            const { items } = req.body;

            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Invalid request: items array required' });
            }

            const skus = items.map((i: StockCheckItem) => i.sku);
            let inventory = MOCK_INVENTORY;
            let usingMock = true;

            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('inventory')
                        .select('sku, name, on_hand, reserved')
                        .in('sku', skus);

                    if (!error && data) {
                        inventory = data;
                        usingMock = false;
                    }
                }
            } catch (err) {
                console.error('Supabase stock check error:', err);
            }

            const shortages: Shortage[] = [];

            for (const item of items) {
                const stock = inventory.find((i: any) => i.sku === item.sku);
                const available = stock ? stock.on_hand - stock.reserved : 0;

                if (available < item.quantity) {
                    shortages.push({
                        sku: item.sku,
                        requested: item.quantity,
                        available: Math.max(0, available),
                        deficit: item.quantity - available
                    });
                }
            }

            return res.json({
                available: shortages.length === 0,
                shortages,
                checked_at: new Date().toISOString(),
                mock: usingMock
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Inventory handler error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
