import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { SettingsSlider } from '../ui/SettingsSlider';
import { ChipSelect } from '../ui/SegmentedControl';
import { COLOR_TEMPERATURES, BEAM_ANGLES } from '../../../constants';

interface LightingSectionProps {
  colorTemp?: string;
  onColorTempChange?: (tempId: string) => void;
  lightIntensity?: number;
  onLightIntensityChange?: (val: number) => void;
  darknessLevel?: number;
  onDarknessLevelChange?: (val: number) => void;
  beamAngle?: number;
  onBeamAngleChange?: (angle: number) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const LightingSection: React.FC<LightingSectionProps> = ({
  colorTemp = '3000k',
  onColorTempChange,
  lightIntensity = 50,
  onLightIntensityChange,
  darknessLevel = 85,
  onDarknessLevelChange,
  beamAngle = 45,
  onBeamAngleChange
}) => {
  return (
    <motion.div
      key="lighting"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Configure default lighting settings for image generation.
      </p>

      <SettingsCard className="p-6 space-y-8">
        {/* Color Temperature */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
            Default Color Temperature
          </label>
          <ChipSelect
            options={COLOR_TEMPERATURES.slice(0, 4).map(t => ({
              value: t.id,
              label: t.kelvin,
              sublabel: t.description,
              color: t.color
            }))}
            value={colorTemp}
            onChange={(v) => onColorTempChange?.(v)}
            columns={4}
          />
        </div>

        {/* Holiday Colors */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
            Holiday & Seasonal
          </label>
          <div className="grid grid-cols-2 gap-4">
            {COLOR_TEMPERATURES.slice(4).map((temp) => (
              <button
                key={temp.id}
                onClick={() => onColorTempChange?.(temp.id)}
                className={`relative p-4 rounded-xl border flex items-center gap-4 transition-all hover:scale-[1.01] ${
                  colorTemp === temp.id
                    ? temp.id === 'christmas'
                      ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                      : 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(147,51,234,0.15)]'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className="flex gap-1.5">
                  {temp.id === 'christmas' ? (
                    <>
                      <div className="w-5 h-5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                      <div className="w-5 h-5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                      <div className="w-5 h-5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]" />
                    </>
                  )}
                </div>
                <div className="text-left">
                  <span className={`text-sm font-semibold ${
                    colorTemp === temp.id
                      ? temp.id === 'christmas' ? 'text-red-400' : 'text-purple-400'
                      : 'text-white'
                  }`}>
                    {temp.description}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">{temp.kelvin}</span>
                </div>
                {colorTemp === temp.id && (
                  <div className={`absolute top-3 right-3 ${temp.id === 'christmas' ? 'text-red-400' : 'text-purple-400'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Beam Angle */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
            Default Beam Spread
          </label>
          <ChipSelect
            options={BEAM_ANGLES.map(a => ({
              value: a.id,
              label: a.label,
              sublabel: a.description
            }))}
            value={beamAngle}
            onChange={(v) => onBeamAngleChange?.(v)}
            columns={4}
          />
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/5">
          {onLightIntensityChange && (
            <SettingsSlider
              label="Light Intensity"
              value={lightIntensity}
              onChange={onLightIntensityChange}
            />
          )}
          {onDarknessLevelChange && (
            <SettingsSlider
              label="Sky Darkness"
              value={darknessLevel}
              onChange={onDarknessLevelChange}
            />
          )}
        </div>
      </SettingsCard>
    </motion.div>
  );
};
