import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Plus,
  Copy,
  Trash2,
  Star,
  Home,
  Building2,
  Snowflake,
  Sparkles,
  ChevronRight,
  Lightbulb,
  Check,
} from 'lucide-react';
import { ProjectTemplate, TemplateCategory, CATEGORY_INFO, useTemplates } from '../../hooks/useTemplates';
import { Button } from '../Button';

interface ProjectTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

// Category icons
const categoryIcons: Record<TemplateCategory, React.ElementType> = {
  residential: Home,
  commercial: Building2,
  holiday: Snowflake,
  custom: Sparkles,
};

// Template Card Component
const TemplateCard: React.FC<{
  template: ProjectTemplate;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isSelected?: boolean;
}> = ({ template, onSelect, onDuplicate, onDelete, isSelected }) => {
  const categoryConfig = CATEGORY_INFO[template.category];
  const CategoryIcon = categoryIcons[template.category];
  const fixtureCount = template.fixtures.reduce((sum, f) => sum + f.quantity, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`relative bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-[#F6B45A] ring-2 ring-[#F6B45A]/20'
          : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      {/* Thumbnail or Placeholder */}
      <div className="relative h-24 rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-white/5 to-black/20">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Lightbulb className="w-8 h-8 text-gray-600" />
          </div>
        )}

        {/* Category badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryConfig.bgColor} ${categoryConfig.color}`}>
          {categoryConfig.label}
        </div>

        {/* Default badge */}
        {template.isDefault && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white">
            Default
          </div>
        )}

        {/* Selected checkmark */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-[#F6B45A] flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-black" />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <h4 className="text-sm font-semibold text-white truncate mb-1">{template.name}</h4>
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{template.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Lightbulb className="w-3 h-3" />
          <span>{fixtureCount} fixtures</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            title="Duplicate template"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {!template.isDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
              title="Delete template"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Usage count */}
      {template.usageCount > 0 && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-[#F6B45A] text-black text-[10px] font-bold">
          {template.usageCount}x
        </div>
      )}
    </motion.div>
  );
};

export const ProjectTemplates: React.FC<ProjectTemplatesProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const {
    templates,
    templatesByCategory,
    popularTemplates,
    duplicateTemplate,
    deleteTemplate,
    useTemplate,
  } = useTemplates();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all' | 'popular'>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Filter by category
    if (selectedCategory === 'popular') {
      result = popularTemplates;
    } else if (selectedCategory !== 'all') {
      result = templatesByCategory[selectedCategory];
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [templates, templatesByCategory, popularTemplates, selectedCategory, searchQuery]);

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
  };

  const handleUseTemplate = () => {
    if (!selectedTemplateId) return;

    const template = useTemplate(selectedTemplateId);
    if (template) {
      onSelectTemplate(template);
      onClose();
    }
  };

  const handleDuplicate = (templateId: string) => {
    duplicateTemplate(templateId);
  };

  const handleDelete = (templateId: string) => {
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
    }
    deleteTemplate(templateId);
  };

  const categories: Array<{ id: TemplateCategory | 'all' | 'popular'; label: string; icon: React.ElementType }> = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'popular', label: 'Popular', icon: Star },
    { id: 'residential', label: 'Residential', icon: Home },
    { id: 'commercial', label: 'Commercial', icon: Building2 },
    { id: 'holiday', label: 'Holiday', icon: Snowflake },
    { id: 'custom', label: 'Custom', icon: Plus },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-3xl sm:max-h-[85vh] overflow-hidden"
          >
            <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white">Project Templates</h2>
                  <p className="text-xs text-gray-500">Quick-start your project with a preset fixture package</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Filters */}
              <div className="px-6 py-4 border-b border-white/5 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-[#F6B45A] text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Templates Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No templates found</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      {searchQuery
                        ? `No templates match "${searchQuery}"`
                        : 'No templates in this category yet'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filteredTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          isSelected={selectedTemplateId === template.id}
                          onSelect={() => handleSelectTemplate(template)}
                          onDuplicate={() => handleDuplicate(template.id)}
                          onDelete={() => handleDelete(template.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/30">
                <p className="text-xs text-gray-500">
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleUseTemplate}
                    disabled={!selectedTemplateId}
                    className="min-w-[120px]"
                  >
                    Use Template
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectTemplates;
