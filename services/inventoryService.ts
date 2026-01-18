const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface InventoryItem {
  sku: string;
  name: string;
  on_hand: number;
  reserved: number;
}

export async function getInventory(): Promise<InventoryItem[]> {
  try {
    const response = await fetch(`${API_URL}/api/inventory`);
    if (!response.ok) throw new Error('Failed to fetch inventory');
    return await response.json();
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return [];
  }
}