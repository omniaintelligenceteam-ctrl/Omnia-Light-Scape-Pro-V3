import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

// Base shimmer skeleton element
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`shimmer bg-white/5 rounded ${className}`} />
);

// Quote Cover Section Skeleton
export const QuoteCoverSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-2xl overflow-hidden"
  >
    {/* Image placeholder */}
    <div className="absolute inset-0 shimmer bg-white/5" />

    {/* Frosted overlay skeleton */}
    <div className="absolute inset-0 flex items-end p-6 md:p-10">
      <div className="glass-card rounded-2xl p-6 w-full max-w-md">
        {/* Logo placeholder */}
        <Skeleton className="w-16 h-16 rounded-xl mb-4" />

        {/* Company name */}
        <Skeleton className="w-32 h-6 mb-2" />

        {/* "Prepared for" text */}
        <Skeleton className="w-24 h-4 mb-1" />
        <Skeleton className="w-48 h-8" />
      </div>
    </div>

    {/* Corner decoration placeholder */}
    <div className="absolute top-4 right-4">
      <Skeleton className="w-24 h-12 rounded-lg" />
    </div>
  </motion.div>
);

// Pricing Table Skeleton
export const PricingTableSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-3"
  >
    {/* Header row */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <Skeleton className="w-24 h-4" />
      <div className="flex gap-8">
        <Skeleton className="w-12 h-4" />
        <Skeleton className="w-16 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
    </div>

    {/* Line items */}
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="flex items-center justify-between px-4 py-4 bg-white/[0.02] rounded-xl stagger-item"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="flex-1">
          <Skeleton className="w-48 h-5 mb-2" />
          <Skeleton className="w-32 h-3" />
        </div>
        <div className="flex gap-8 items-center">
          <Skeleton className="w-8 h-6 rounded-full" />
          <Skeleton className="w-16 h-5" />
          <Skeleton className="w-20 h-5" />
        </div>
      </div>
    ))}

    {/* Totals section */}
    <div className="pt-4 border-t border-white/10 space-y-2">
      <div className="flex justify-between px-4">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>
      <div className="flex justify-between px-4">
        <Skeleton className="w-16 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
      <div className="flex justify-between px-4 pt-2">
        <Skeleton className="w-24 h-6" />
        <Skeleton className="w-32 h-8" />
      </div>
    </div>
  </motion.div>
);

// Invoice Status Hero Skeleton
export const InvoiceStatusSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center text-center p-8"
  >
    {/* Status badge */}
    <Skeleton className="w-32 h-10 rounded-full mb-4" />

    {/* Amount */}
    <Skeleton className="w-48 h-16 rounded-xl mb-2" />

    {/* Due date */}
    <Skeleton className="w-36 h-5 rounded mb-6" />

    {/* Invoice number */}
    <Skeleton className="w-40 h-4 rounded" />
  </motion.div>
);

// Portal Project Card Skeleton
export const ProjectCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5"
  >
    {/* Image placeholder */}
    <div className="aspect-[16/10] shimmer bg-white/5" />

    {/* Content */}
    <div className="p-4 space-y-3">
      {/* Status badge */}
      <Skeleton className="w-24 h-6 rounded-full" />

      {/* Project name */}
      <Skeleton className="w-40 h-6" />

      {/* Date */}
      <Skeleton className="w-28 h-4" />

      {/* Price */}
      <Skeleton className="w-24 h-5" />

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="flex-1 h-10 rounded-xl" />
        <Skeleton className="flex-1 h-10 rounded-xl" />
      </div>
    </div>
  </motion.div>
);

// Portal Summary Card Skeleton
export const SummaryCardSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-2xl p-6 border border-white/5"
  >
    <div className="flex items-center gap-4">
      {/* Icon placeholder */}
      <Skeleton className="w-12 h-12 rounded-xl" />

      <div className="flex-1">
        {/* Label */}
        <Skeleton className="w-24 h-4 mb-2" />
        {/* Value */}
        <Skeleton className="w-16 h-8" />
      </div>
    </div>
  </motion.div>
);

// Full Quote Page Skeleton
export const QuotePageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#050505] p-4 md:p-8">
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cover section */}
      <QuoteCoverSkeleton />

      {/* Pricing table */}
      <div className="bg-[#111]/50 rounded-2xl p-6 border border-white/5">
        <Skeleton className="w-32 h-6 mb-6" />
        <PricingTableSkeleton />
      </div>

      {/* Approval section */}
      <div className="bg-[#111]/50 rounded-2xl p-6 border border-white/5">
        <Skeleton className="w-40 h-6 mb-4" />
        <Skeleton className="w-full h-32 rounded-xl mb-4" />
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>
    </div>
  </div>
);

// Full Invoice Page Skeleton
export const InvoicePageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Status hero */}
      <div className="bg-[#111]/50 rounded-2xl border border-white/5">
        <InvoiceStatusSkeleton />
      </div>

      {/* Invoice details */}
      <div className="bg-[#111]/50 rounded-2xl p-6 border border-white/5">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Skeleton className="w-20 h-4 mb-2" />
            <Skeleton className="w-32 h-5" />
          </div>
          <div>
            <Skeleton className="w-20 h-4 mb-2" />
            <Skeleton className="w-28 h-5" />
          </div>
        </div>

        <PricingTableSkeleton />
      </div>

      {/* Payment button */}
      <Skeleton className="w-full h-14 rounded-xl" />
    </div>
  </div>
);

// Full Portal Page Skeleton
export const PortalPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#050505] p-4 md:p-8">
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div>
          <Skeleton className="w-32 h-6 mb-2" />
          <Skeleton className="w-48 h-4" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export default {
  Skeleton,
  QuoteCoverSkeleton,
  PricingTableSkeleton,
  InvoiceStatusSkeleton,
  ProjectCardSkeleton,
  SummaryCardSkeleton,
  QuotePageSkeleton,
  InvoicePageSkeleton,
  PortalPageSkeleton
};
