import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

// Base Skeleton Element
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
}) => (
  <div
    className={`shimmer bg-white/5 rounded ${className}`}
    style={{ width, height }}
  />
);

// Skeleton for Project Cards
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`shimmer rounded-2xl overflow-hidden bg-[#151515] border border-white/5 ${className}`}>
    <div className="h-40 bg-white/5" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-white/5 rounded w-1/3" />
      <div className="h-5 bg-white/5 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
  </div>
);

// Skeleton for Table Rows
export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <tr className="border-b border-white/5">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="shimmer h-4 bg-white/5 rounded w-full" />
      </td>
    ))}
  </tr>
);

// Skeleton for Text Lines
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="shimmer h-4 bg-white/5 rounded"
        style={{ width: `${100 - i * 15}%` }}
      />
    ))}
  </div>
);

// Skeleton for Avatar/Circle
export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg';
}> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return <div className={`shimmer rounded-full bg-white/5 ${sizes[size]}`} />;
};

// Skeleton for Image
export const SkeletonImage: React.FC<{
  aspectRatio?: 'square' | 'video' | 'wide';
  className?: string;
}> = ({ aspectRatio = 'video', className = '' }) => {
  const ratios = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
  };

  return (
    <div className={`shimmer bg-white/5 rounded-xl ${ratios[aspectRatio]} ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  );
};

// Skeleton for Settings Section
export const SkeletonSection: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="shimmer w-10 h-10 rounded-xl bg-white/5" />
      <div className="shimmer h-5 bg-white/5 rounded w-32" />
    </div>
    <div className="space-y-3 pl-13">
      <div className="shimmer h-4 bg-white/5 rounded w-full" />
      <div className="shimmer h-4 bg-white/5 rounded w-3/4" />
      <div className="shimmer h-4 bg-white/5 rounded w-1/2" />
    </div>
  </div>
);

// Skeleton for Form Fields
export const SkeletonInput: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    <div className="shimmer h-3 bg-white/5 rounded w-20" />
    <div className="shimmer h-12 bg-white/5 rounded-xl" />
  </div>
);

// Loading Grid for Projects
export const SkeletonProjectGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// Skeleton for Kanban Card
export const SkeletonKanbanCard: React.FC = () => (
  <div className="shimmer rounded-xl bg-[#151515] border border-white/5 p-4 space-y-3">
    {/* Image placeholder */}
    <div className="h-24 bg-white/5 rounded-lg" />
    {/* Client name */}
    <div className="h-4 bg-white/5 rounded w-2/3" />
    {/* Address */}
    <div className="h-3 bg-white/5 rounded w-full" />
    {/* Price */}
    <div className="flex justify-between items-center pt-2">
      <div className="h-5 bg-white/5 rounded w-20" />
      <div className="h-6 w-6 bg-white/5 rounded-full" />
    </div>
  </div>
);

// Skeleton for Kanban Column
export const SkeletonKanbanColumn: React.FC<{ cardCount?: number }> = ({ cardCount = 3 }) => (
  <div className="w-72 flex-shrink-0 space-y-3">
    {/* Column Header */}
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="shimmer w-3 h-3 rounded-full bg-white/5" />
        <div className="shimmer h-4 bg-white/5 rounded w-20" />
      </div>
      <div className="shimmer h-5 w-8 bg-white/5 rounded-full" />
    </div>
    {/* Cards */}
    <div className="space-y-3">
      {Array.from({ length: cardCount }).map((_, i) => (
        <SkeletonKanbanCard key={i} />
      ))}
    </div>
  </div>
);

// Skeleton for Kanban Board
export const SkeletonKanbanBoard: React.FC = () => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    <SkeletonKanbanColumn cardCount={2} />
    <SkeletonKanbanColumn cardCount={3} />
    <SkeletonKanbanColumn cardCount={1} />
    <SkeletonKanbanColumn cardCount={2} />
    <SkeletonKanbanColumn cardCount={1} />
  </div>
);

// Skeleton for Stat Card
export const SkeletonStatCard: React.FC = () => (
  <div className="shimmer rounded-xl bg-[#151515] border border-white/5 p-5 space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-3 bg-white/5 rounded w-24" />
      <div className="h-8 w-8 bg-white/5 rounded-xl" />
    </div>
    <div className="h-8 bg-white/5 rounded w-32" />
    <div className="h-3 bg-white/5 rounded w-20" />
  </div>
);

// Skeleton for Stats Grid
export const SkeletonStatsGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStatCard key={i} />
    ))}
  </div>
);

// Skeleton for Chart
export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="shimmer rounded-xl bg-[#151515] border border-white/5 p-5 space-y-4">
    {/* Chart title */}
    <div className="flex items-center justify-between">
      <div className="h-5 bg-white/5 rounded w-32" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-white/5 rounded" />
        <div className="h-6 w-16 bg-white/5 rounded" />
      </div>
    </div>
    {/* Chart area */}
    <div className="bg-white/5 rounded-lg" style={{ height }} />
  </div>
);

// Skeleton for Schedule/Calendar Day
export const SkeletonScheduleDay: React.FC = () => (
  <div className="shimmer rounded-xl bg-[#151515] border border-white/5 p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-white/5 rounded w-24" />
      <div className="h-6 w-6 bg-white/5 rounded-full" />
    </div>
    <div className="space-y-2">
      <div className="h-12 bg-white/5 rounded-lg" />
      <div className="h-12 bg-white/5 rounded-lg" />
    </div>
  </div>
);

// Skeleton for List Item
export const SkeletonListItem: React.FC = () => (
  <div className="shimmer flex items-center gap-4 p-4 border-b border-white/5">
    <div className="w-10 h-10 bg-white/5 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-white/5 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
    <div className="h-8 w-20 bg-white/5 rounded-lg" />
  </div>
);

// Skeleton for List
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="divide-y divide-white/5">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonListItem key={i} />
    ))}
  </div>
);
