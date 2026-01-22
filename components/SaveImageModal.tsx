import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderPlus,
  UserPlus,
  Users,
  Search,
  Loader2,
  Check,
  ArrowLeft
} from 'lucide-react';
import { Client } from '../types';

interface SaveImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToDrafts: () => void;
  onSaveToNewClient: (clientData: Partial<Client>) => void;
  onSaveToExistingClient: (clientId: string, clientName: string) => void;
  clients: Client[];
  searchClients: (query: string) => Promise<Client[]>;
  isSaving: boolean;
}

type ModalView = 'options' | 'new-client' | 'existing-client';

export const SaveImageModal: React.FC<SaveImageModalProps> = ({
  isOpen,
  onClose,
  onSaveToDrafts,
  onSaveToNewClient,
  onSaveToExistingClient,
  clients,
  searchClients,
  isSaving
}) => {
  const [view, setView] = useState<ModalView>('options');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // New client form state
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('options');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedClient(null);
      setNewClientData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
      });
    }
  }, [isOpen]);

  // Search clients with debounce
  useEffect(() => {
    if (view !== 'existing-client') return;

    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const results = await searchClients(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        // Show recent clients when no search query
        setSearchResults(clients.slice(0, 10));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, view, searchClients, clients]);

  // Initialize search results when entering existing client view
  useEffect(() => {
    if (view === 'existing-client' && !searchQuery) {
      setSearchResults(clients.slice(0, 10));
    }
  }, [view, clients, searchQuery]);

  const handleSaveNewClient = () => {
    if (!newClientData.name.trim()) return;
    onSaveToNewClient(newClientData);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const handleConfirmExistingClient = () => {
    if (!selectedClient) return;
    onSaveToExistingClient(selectedClient.id, selectedClient.name);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#111] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {view !== 'options' && (
                <motion.button
                  onClick={() => setView('options')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
              )}
              <h3 className="text-lg font-bold text-white">
                {view === 'options' && 'Save Generated Image'}
                {view === 'new-client' && 'New Client'}
                {view === 'existing-client' && 'Select Client'}
              </h3>
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Main Options View */}
            {view === 'options' && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">
                  Choose where to save this design:
                </p>

                {/* Save to Drafts */}
                <motion.button
                  onClick={onSaveToDrafts}
                  disabled={isSaving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 bg-[#F6B45A]/10 border border-[#F6B45A]/30 rounded-xl text-left hover:bg-[#F6B45A]/20 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F6B45A]/20 flex items-center justify-center group-hover:bg-[#F6B45A]/30 transition-colors">
                      <FolderPlus className="w-6 h-6 text-[#F6B45A]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Save to Drafts</h4>
                      <p className="text-sm text-gray-400">Save without assigning to a client</p>
                    </div>
                  </div>
                </motion.button>

                {/* New Client */}
                <motion.button
                  onClick={() => setView('new-client')}
                  disabled={isSaving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-left hover:bg-emerald-500/20 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                      <UserPlus className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">New Client</h4>
                      <p className="text-sm text-gray-400">Create a new client and save the image</p>
                    </div>
                  </div>
                </motion.button>

                {/* Existing Client */}
                <motion.button
                  onClick={() => setView('existing-client')}
                  disabled={isSaving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-left hover:bg-blue-500/20 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Existing Client</h4>
                      <p className="text-sm text-gray-400">Assign to an existing client</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            )}

            {/* New Client Form */}
            {view === 'new-client' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                    placeholder="Client name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    placeholder="client@example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newClientData.address}
                    onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                    placeholder="123 Main St, City, State"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <motion.button
                  onClick={handleSaveNewClient}
                  disabled={!newClientData.name.trim() || isSaving}
                  whileHover={{ scale: newClientData.name.trim() && !isSaving ? 1.02 : 1 }}
                  whileTap={{ scale: newClientData.name.trim() && !isSaving ? 0.98 : 1 }}
                  className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Create Client & Save Image
                    </>
                  )}
                </motion.button>
              </div>
            )}

            {/* Existing Client Search */}
            {view === 'existing-client' && (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    autoFocus
                  />
                </div>

                {/* Search Results */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No clients found' : 'No clients yet'}
                    </div>
                  ) : (
                    searchResults.map((client) => (
                      <motion.button
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          selectedClient?.id === client.id
                            ? 'bg-blue-500/20 border-2 border-blue-500'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{client.name}</p>
                            {client.email && (
                              <p className="text-sm text-gray-400">{client.email}</p>
                            )}
                          </div>
                          {selectedClient?.id === client.id && (
                            <Check className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>

                {/* Confirm Button */}
                <motion.button
                  onClick={handleConfirmExistingClient}
                  disabled={!selectedClient || isSaving}
                  whileHover={{ scale: selectedClient && !isSaving ? 1.02 : 1 }}
                  whileTap={{ scale: selectedClient && !isSaving ? 0.98 : 1 }}
                  className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save to {selectedClient?.name || 'Client'}
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaveImageModal;
