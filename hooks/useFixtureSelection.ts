import { useState, useCallback, useEffect } from 'react';

export interface FixturePreset {
  id: string;
  name: string;
  fixtures: string[];
  subOptions: Record<string, string[]>;
  counts: Record<string, number | null>;
  placementNotes: Record<string, string>;
  createdAt: string;
}

interface UseFixtureSelectionReturn {
  // Selected fixtures and options
  selectedFixtures: string[];
  fixtureSubOptions: Record<string, string[]>;
  fixtureCounts: Record<string, number | null>;
  fixturePlacementNotes: Record<string, string>;
  
  // Config panel state
  activeConfigFixture: string | null;
  pendingOptions: string[];
  pendingCounts: Record<string, number | null>;
  
  // Presets
  fixturePresets: FixturePreset[];
  showSavePresetModal: boolean;
  newPresetName: string;
  
  // Actions
  setSelectedFixtures: React.Dispatch<React.SetStateAction<string[]>>;
  setFixtureSubOptions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setFixtureCounts: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  setFixturePlacementNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setActiveConfigFixture: React.Dispatch<React.SetStateAction<string | null>>;
  setPendingOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingCounts: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  setShowSavePresetModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNewPresetName: React.Dispatch<React.SetStateAction<string>>;
  
  // Preset actions
  savePreset: () => void;
  loadPreset: (preset: FixturePreset) => void;
  deletePreset: (presetId: string) => void;
  
  // Config panel actions
  openConfigPanel: (fixtureId: string) => void;
  closeConfigPanel: () => void;
  applyPendingChanges: () => void;
  
  // Utility
  clearAllFixtures: () => void;
  hasFixturesSelected: boolean;
}

const PRESETS_STORAGE_KEY = 'omnia_fixture_presets';

export function useFixtureSelection(): UseFixtureSelectionReturn {
  // Main fixture selection state
  const [selectedFixtures, setSelectedFixtures] = useState<string[]>([]);
  const [fixtureSubOptions, setFixtureSubOptions] = useState<Record<string, string[]>>({});
  const [fixtureCounts, setFixtureCounts] = useState<Record<string, number | null>>({});
  const [fixturePlacementNotes, setFixturePlacementNotes] = useState<Record<string, string>>({});
  
  // Config panel state (for editing individual fixture options)
  const [activeConfigFixture, setActiveConfigFixture] = useState<string | null>(null);
  const [pendingOptions, setPendingOptions] = useState<string[]>([]);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number | null>>({});
  
  // Preset state
  const [fixturePresets, setFixturePresets] = useState<FixturePreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Persist presets to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(fixturePresets));
    }
  }, [fixturePresets]);

  // Save current selection as a preset
  const savePreset = useCallback(() => {
    if (!newPresetName.trim()) return;
    
    const preset: FixturePreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      fixtures: [...selectedFixtures],
      subOptions: { ...fixtureSubOptions },
      counts: { ...fixtureCounts },
      placementNotes: { ...fixturePlacementNotes },
      createdAt: new Date().toISOString(),
    };
    
    setFixturePresets(prev => [...prev, preset]);
    setNewPresetName('');
    setShowSavePresetModal(false);
  }, [newPresetName, selectedFixtures, fixtureSubOptions, fixtureCounts, fixturePlacementNotes]);

  // Load a preset
  const loadPreset = useCallback((preset: FixturePreset) => {
    setSelectedFixtures(preset.fixtures);
    setFixtureSubOptions(preset.subOptions);
    setFixtureCounts(preset.counts);
    setFixturePlacementNotes(preset.placementNotes);
  }, []);

  // Delete a preset
  const deletePreset = useCallback((presetId: string) => {
    setFixturePresets(prev => prev.filter(p => p.id !== presetId));
  }, []);

  // Open config panel for a fixture
  const openConfigPanel = useCallback((fixtureId: string) => {
    setActiveConfigFixture(fixtureId);
    setPendingOptions(fixtureSubOptions[fixtureId] || []);
    setPendingCounts({ ...fixtureCounts });
  }, [fixtureSubOptions, fixtureCounts]);

  // Close config panel without saving
  const closeConfigPanel = useCallback(() => {
    setActiveConfigFixture(null);
    setPendingOptions([]);
    setPendingCounts({});
  }, []);

  // Apply pending changes from config panel
  const applyPendingChanges = useCallback(() => {
    if (!activeConfigFixture) return;
    
    setFixtureSubOptions(prev => ({
      ...prev,
      [activeConfigFixture]: pendingOptions,
    }));
    setFixtureCounts(prev => ({
      ...prev,
      ...pendingCounts,
    }));
    closeConfigPanel();
  }, [activeConfigFixture, pendingOptions, pendingCounts, closeConfigPanel]);

  // Clear all selections
  const clearAllFixtures = useCallback(() => {
    setSelectedFixtures([]);
    setFixtureSubOptions({});
    setFixtureCounts({});
    setFixturePlacementNotes({});
  }, []);

  return {
    // State
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    fixturePlacementNotes,
    activeConfigFixture,
    pendingOptions,
    pendingCounts,
    fixturePresets,
    showSavePresetModal,
    newPresetName,
    
    // Setters
    setSelectedFixtures,
    setFixtureSubOptions,
    setFixtureCounts,
    setFixturePlacementNotes,
    setActiveConfigFixture,
    setPendingOptions,
    setPendingCounts,
    setShowSavePresetModal,
    setNewPresetName,
    
    // Actions
    savePreset,
    loadPreset,
    deletePreset,
    openConfigPanel,
    closeConfigPanel,
    applyPendingChanges,
    clearAllFixtures,
    
    // Computed
    hasFixturesSelected: selectedFixtures.length > 0,
  };
}
