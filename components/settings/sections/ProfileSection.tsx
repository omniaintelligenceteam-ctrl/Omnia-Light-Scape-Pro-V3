import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { CardInput } from '../ui/PremiumInput';
import { CompanyProfile } from '../../../types';

interface ProfileSectionProps {
  profile: CompanyProfile;
  onProfileChange?: (profile: CompanyProfile) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  profile,
  onProfileChange
}) => {
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onProfileChange && profile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onProfileChange({ ...profile, logo: event.target.result as string });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <motion.div
      key="profile"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Manage your company details that appear on quotes and invoices.
      </p>

      <SettingsCard className="p-6">
        <div className="flex gap-8">
          {/* Logo Upload */}
          <div className="shrink-0">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">
              Logo
            </label>
            <div className="relative w-28 h-28 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex items-center justify-center overflow-hidden hover:border-[#F6B45A]/50 transition-colors cursor-pointer group">
              {profile.logo ? (
                <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-3" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-[#F6B45A] transition-colors">
                  <Upload className="w-6 h-6" />
                  <span className="text-[10px] font-medium">Upload</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <CardInput
                label="Company Name"
                value={profile.name}
                onChange={(v) => onProfileChange?.({ ...profile, name: v })}
                placeholder="Your company name"
              />
              <div>
                <CardInput
                  label="Email"
                  value={profile.email}
                  onChange={(v) => {
                    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v === '';
                    setEmailError(isValid ? '' : 'Invalid email format');
                    onProfileChange?.({ ...profile, email: v });
                  }}
                  placeholder="contact@company.com"
                  type="email"
                />
                {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
              </div>
            </div>
            <div>
              <CardInput
                label="Phone Number"
                value={profile.phone || ''}
                onChange={(v) => {
                  const cleaned = v.replace(/\D/g, '');
                  setPhoneError(cleaned.length >= 10 || v === '' ? '' : 'Phone number too short');
                  onProfileChange?.({ ...profile, phone: v });
                }}
                placeholder="(555) 123-4567"
                type="tel"
              />
              {phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Business Address
              </label>
              <textarea
                value={profile.address}
                onChange={(e) => onProfileChange?.({ ...profile, address: e.target.value })}
                placeholder="Enter your business address"
                rows={2}
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white text-sm
                  placeholder-gray-600 focus:border-[#F6B45A]/50 focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </motion.div>
  );
};
