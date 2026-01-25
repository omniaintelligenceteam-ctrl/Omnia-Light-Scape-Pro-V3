import { useState, useEffect, useCallback, useMemo } from 'react';
import { SavedProject } from '../types';

// Template categories
export type TemplateCategory = 'residential' | 'commercial' | 'holiday' | 'custom';

// Template definition
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fixtures: TemplateFixture[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  thumbnail?: string;
  isDefault?: boolean;
}

// Fixture within a template
export interface TemplateFixture {
  type: string;
  quantity: number;
  notes?: string;
}

const STORAGE_KEY = 'omnia_project_templates';

// Default templates for new users
const DEFAULT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'default-residential-basic',
    name: 'Basic Residential',
    description: 'Standard front yard lighting with path lights and uplights',
    category: 'residential',
    fixtures: [
      { type: 'pathLight', quantity: 8 },
      { type: 'uplight', quantity: 4 },
      { type: 'spotLight', quantity: 2 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    isDefault: true,
  },
  {
    id: 'default-residential-premium',
    name: 'Premium Residential',
    description: 'Full property coverage with accent lighting',
    category: 'residential',
    fixtures: [
      { type: 'pathLight', quantity: 12 },
      { type: 'uplight', quantity: 8 },
      { type: 'spotLight', quantity: 6 },
      { type: 'wellLight', quantity: 4 },
      { type: 'stringLight', quantity: 2 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    isDefault: true,
  },
  {
    id: 'default-commercial',
    name: 'Commercial Storefront',
    description: 'Professional business facade lighting',
    category: 'commercial',
    fixtures: [
      { type: 'uplight', quantity: 10 },
      { type: 'spotLight', quantity: 8 },
      { type: 'wallWash', quantity: 6 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    isDefault: true,
  },
  {
    id: 'default-holiday',
    name: 'Holiday Display',
    description: 'Festive lighting for seasonal decorations',
    category: 'holiday',
    fixtures: [
      { type: 'stringLight', quantity: 10 },
      { type: 'spotLight', quantity: 6 },
      { type: 'pathLight', quantity: 8 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    isDefault: true,
  },
];

// Category display info
export const CATEGORY_INFO: Record<TemplateCategory, { label: string; color: string; bgColor: string }> = {
  residential: { label: 'Residential', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  commercial: { label: 'Commercial', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  holiday: { label: 'Holiday', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  custom: { label: 'Custom', color: 'text-[#F6B45A]', bgColor: 'bg-[#F6B45A]/20' },
};

// Load templates from storage
const loadTemplates = (): ProjectTemplate[] => {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure defaults are always present
      const defaultIds = DEFAULT_TEMPLATES.map(t => t.id);
      const userTemplates = parsed.filter((t: ProjectTemplate) => !defaultIds.includes(t.id));
      return [...DEFAULT_TEMPLATES, ...userTemplates];
    }
  } catch {
    // Invalid stored data
  }
  return DEFAULT_TEMPLATES;
};

// Save templates to storage
const saveTemplates = (templates: ProjectTemplate[]) => {
  if (typeof window === 'undefined') return;
  try {
    // Only save non-default templates
    const userTemplates = templates.filter(t => !t.isDefault);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates));
  } catch {
    // Storage quota exceeded
  }
};

export const useTemplates = () => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>(() => loadTemplates());
  const [isLoading, setIsLoading] = useState(false);

  // Save whenever templates change
  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  // Get templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<TemplateCategory, ProjectTemplate[]> = {
      residential: [],
      commercial: [],
      holiday: [],
      custom: [],
    };

    templates.forEach(template => {
      if (grouped[template.category]) {
        grouped[template.category].push(template);
      }
    });

    return grouped;
  }, [templates]);

  // Get most used templates
  const popularTemplates = useMemo(() => {
    return [...templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }, [templates]);

  // Create template from project
  const createTemplateFromProject = useCallback((
    project: SavedProject,
    name: string,
    description: string,
    category: TemplateCategory
  ): ProjectTemplate => {
    // Extract fixtures from project
    const fixtures: TemplateFixture[] = [];

    if (project.quote?.fixtures) {
      project.quote.fixtures.forEach(fixture => {
        fixtures.push({
          type: fixture.type,
          quantity: fixture.quantity,
          notes: fixture.notes,
        });
      });
    }

    const newTemplate: ProjectTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      category,
      fixtures,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      thumbnail: project.generatedImage || project.image,
    };

    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, []);

  // Create new template manually
  const createTemplate = useCallback((
    name: string,
    description: string,
    category: TemplateCategory,
    fixtures: TemplateFixture[]
  ): ProjectTemplate => {
    const newTemplate: ProjectTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      category,
      fixtures,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };

    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, []);

  // Update template
  const updateTemplate = useCallback((
    templateId: string,
    updates: Partial<Omit<ProjectTemplate, 'id' | 'createdAt' | 'isDefault'>>
  ) => {
    setTemplates(prev => prev.map(template => {
      if (template.id === templateId && !template.isDefault) {
        return {
          ...template,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return template;
    }));
  }, []);

  // Delete template
  const deleteTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId || t.isDefault));
  }, []);

  // Use template (increment usage count)
  const useTemplate = useCallback((templateId: string): ProjectTemplate | null => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return null;

    setTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        return { ...t, usageCount: t.usageCount + 1 };
      }
      return t;
    }));

    return template;
  }, [templates]);

  // Duplicate template
  const duplicateTemplate = useCallback((templateId: string): ProjectTemplate | null => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return null;

    const newTemplate: ProjectTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      isDefault: false,
    };

    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, [templates]);

  // Search templates
  const searchTemplates = useCallback((query: string): ProjectTemplate[] => {
    if (!query.trim()) return templates;

    const lowerQuery = query.toLowerCase();
    return templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.category.toLowerCase().includes(lowerQuery)
    );
  }, [templates]);

  return {
    templates,
    templatesByCategory,
    popularTemplates,
    isLoading,

    // Actions
    createTemplate,
    createTemplateFromProject,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    duplicateTemplate,
    searchTemplates,

    // Utilities
    categoryInfo: CATEGORY_INFO,
  };
};

export default useTemplates;
