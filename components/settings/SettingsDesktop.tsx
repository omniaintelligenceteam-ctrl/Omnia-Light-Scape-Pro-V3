import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Save } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { SettingsNav, SettingsSection } from './SettingsNav';
import { SettingsViewProps } from './types';
import { LocationsSection } from './LocationsSection';
import { TechniciansSection } from './TechniciansSection';
import { TeamSection } from './TeamSection';
import { GoalsSection } from './GoalsSection';
import { useOrganization } from '../../hooks/useOrganization';
import { InventoryView } from '../InventoryView';
import {
  ProfileSection,
  AppearanceSection,
  NotificationsSection,
  PricingSection,
  CatalogSection,
  LightingSection,
  FollowUpsSection,
  SubscriptionSection,
  AnalyticsSection,
  SupportSection,
  ReportsSection
} from './sections';
import { ExpenseList } from '../expenses/ExpenseList';

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const SettingsDesktop: React.FC<SettingsViewProps> = ({
  profile,
  onProfileChange,
  colorTemp = '3000k',
  onColorTempChange,
  lightIntensity = 50,
  onLightIntensityChange,
  darknessLevel = 85,
  onDarknessLevelChange,
  beamAngle = 45,
  onBeamAngleChange,
  pricing,
  onPricingChange,
  customPricing = [],
  onCustomPricingChange,
  fixtureCatalog = [],
  onFixtureCatalogChange,
  subscription,
  onRequestUpgrade,
  theme = 'dark',
  onThemeChange,
  accentColor = 'gold',
  onAccentColorChange,
  fontSize = 'normal',
  onFontSizeChange,
  highContrast = false,
  onHighContrastChange,
  notifications,
  onNotificationsChange,
  followUpSettings,
  onFollowUpSettingsChange,
  businessGoals,
  onBusinessGoalChange,
  onSignOut,
  onSaveSettings,
  isSaving = false,
  onManageSubscription,
  isLoadingPortal = false,
  locations = [],
  locationsLoading = false,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  selectedLocationId = null,
  onLocationChange,
  technicians = [],
  techniciansLoading = false,
  onCreateTechnician,
  onUpdateTechnician,
  onDeleteTechnician,
  currentMonthRevenue = 0,
  currentMonthProjects = 0,
  currentMonthClients = 0,
  currentQuarterRevenue = 0,
  currentQuarterProjects = 0,
  currentQuarterClients = 0,
  currentYearRevenue = 0,
  currentYearProjects = 0,
  currentYearClients = 0,
  // Analytics props
  analyticsMetrics,
  leadSourceROI,
  cashFlowForecast,
  locationMetrics,
  technicianMetrics,
  companyMetrics,
  // Advanced Analytics (formerly in Projects section)
  pipelineAnalytics,
  businessHealthData,
  pipelineForecastData,
  teamPerformanceData,
  capacityPlanningData,
  onViewProject
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const { isOwner, isAdmin } = useOrganization();
  const { user } = useUser();

  // Stripe Connect state
  const [stripeConnect, setStripeConnect] = useState<{
    connected: boolean;
    status: 'pending' | 'active' | 'restricted' | null;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  }>({ connected: false, status: null });
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

  // Fetch Stripe Connect status on mount
  useEffect(() => {
    const fetchStripeStatus = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/stripe/connect?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setStripeConnect({
            connected: data.connected,
            status: data.status,
            chargesEnabled: data.chargesEnabled,
            payoutsEnabled: data.payoutsEnabled
          });
        }
      } catch (err) {
        console.error('Failed to fetch Stripe status:', err);
      }
    };
    fetchStripeStatus();
  }, [user?.id]);

  // Handler to start Stripe Connect onboarding
  const handleConnectStripe = async () => {
    if (!user?.id) return;
    setIsConnectingStripe(true);
    try {
      const res = await fetch(`/api/stripe/connect?userId=${user.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.onboardingUrl) {
        window.open(data.onboardingUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to start Stripe Connect:', err);
    } finally {
      setIsConnectingStripe(false);
    }
  };

  // Handler to open Stripe Express dashboard
  const handleOpenStripeDashboard = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/stripe/dashboard?userId=${user.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.loginUrl) {
        window.open(data.loginUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to open Stripe dashboard:', err);
    }
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-[#050505] via-[#080808] to-[#0a0a0a]">
      {/* Sidebar Navigation */}
      <SettingsNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={onSignOut}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-8 py-5">
            <h1 className="text-2xl font-bold text-white capitalize">{activeSection}</h1>
            <div className="flex items-center gap-3">
              {onSaveSettings && (
                <motion.button
                  onClick={onSaveSettings}
                  disabled={isSaving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] text-black rounded-xl font-semibold text-sm disabled:opacity-50 shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.3)] transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={`p-8 pb-24 ${activeSection === 'analytics' ? 'max-w-7xl' : 'max-w-3xl'}`}>
          <AnimatePresence mode="wait">
            {/* Profile Section */}
            {activeSection === 'profile' && profile && (
              <ProfileSection
                profile={profile}
                onProfileChange={onProfileChange}
                stripeConnect={stripeConnect}
                onConnectStripe={handleConnectStripe}
                onOpenStripeDashboard={handleOpenStripeDashboard}
                isConnectingStripe={isConnectingStripe}
              />
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <AppearanceSection
                theme={theme}
                onThemeChange={onThemeChange}
                accentColor={accentColor}
                onAccentColorChange={onAccentColorChange}
                fontSize={fontSize}
                onFontSizeChange={onFontSizeChange}
                highContrast={highContrast}
                onHighContrastChange={onHighContrastChange}
              />
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && notifications && (
              <NotificationsSection
                notifications={notifications}
                onNotificationsChange={onNotificationsChange}
              />
            )}

            {/* Pricing Section */}
            {activeSection === 'pricing' && pricing && (
              <PricingSection
                pricing={pricing}
                onPricingChange={onPricingChange}
                customPricing={customPricing}
                onCustomPricingChange={onCustomPricingChange}
              />
            )}

            {/* Catalog Section */}
            {activeSection === 'catalog' && (
              <CatalogSection
                fixtureCatalog={fixtureCatalog}
                onFixtureCatalogChange={onFixtureCatalogChange}
              />
            )}

            {/* Inventory Section */}
            {activeSection === 'inventory' && (
              <motion.div
                key="inventory"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Manage your fixture inventory and stock levels.
                </p>

                <InventoryView />
              </motion.div>
            )}

            {/* Lighting Section */}
            {activeSection === 'lighting' && (
              <LightingSection
                colorTemp={colorTemp}
                onColorTempChange={onColorTempChange}
                lightIntensity={lightIntensity}
                onLightIntensityChange={onLightIntensityChange}
                darknessLevel={darknessLevel}
                onDarknessLevelChange={onDarknessLevelChange}
                beamAngle={beamAngle}
                onBeamAngleChange={onBeamAngleChange}
              />
            )}

            {/* Follow-ups Section */}
            {activeSection === 'followups' && (
              <FollowUpsSection
                followUpSettings={followUpSettings}
                onFollowUpSettingsChange={onFollowUpSettingsChange}
              />
            )}

            {/* Goals Section */}
            {activeSection === 'goals' && (
              <motion.div
                key="goals"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Set business goals to track your performance. Goals help you stay on track with revenue, projects, and client acquisition.
                </p>

                <GoalsSection
                  businessGoals={businessGoals || []}
                  onBusinessGoalChange={onBusinessGoalChange!}
                  currentMonth={{
                    revenue: currentMonthRevenue,
                    projects: currentMonthProjects,
                    clients: currentMonthClients
                  }}
                  currentQuarter={{
                    revenue: currentQuarterRevenue,
                    projects: currentQuarterProjects,
                    clients: currentQuarterClients
                  }}
                  currentYear={{
                    revenue: currentYearRevenue,
                    projects: currentYearProjects,
                    clients: currentYearClients
                  }}
                />
              </motion.div>
            )}

            {/* Subscription Section */}
            {activeSection === 'subscription' && subscription && (
              <SubscriptionSection
                subscription={subscription}
                onRequestUpgrade={onRequestUpgrade}
                onManageSubscription={onManageSubscription}
                isLoadingPortal={isLoadingPortal}
              />
            )}

            {/* Locations Section */}
            {activeSection === 'locations' && onCreateLocation && onUpdateLocation && onDeleteLocation && (
              <motion.div
                key="locations"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <LocationsSection
                  locations={locations}
                  locationMetrics={locationMetrics?.locations}
                  isLoading={locationsLoading}
                  onCreateLocation={onCreateLocation}
                  onUpdateLocation={onUpdateLocation}
                  onDeleteLocation={onDeleteLocation}
                  selectedLocationId={selectedLocationId}
                  onLocationChange={onLocationChange!}
                />
              </motion.div>
            )}

            {/* Technicians Section */}
            {activeSection === 'technicians' && onCreateTechnician && onUpdateTechnician && onDeleteTechnician && (
              <motion.div
                key="technicians"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <TechniciansSection
                  technicians={technicians}
                  technicianMetrics={technicianMetrics}
                  locations={locations}
                  isLoading={techniciansLoading}
                  onCreateTechnician={onCreateTechnician}
                  onUpdateTechnician={onUpdateTechnician}
                  onDeleteTechnician={onDeleteTechnician}
                />
              </motion.div>
            )}

            {/* Team Section */}
            {activeSection === 'team' && (
              <motion.div
                key="team"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <TeamSection isOwner={isOwner} isAdmin={isAdmin} />
              </motion.div>
            )}

            {/* Analytics Section */}
            {activeSection === 'analytics' && (
              <AnalyticsSection
                analyticsMetrics={analyticsMetrics}
                leadSourceROI={leadSourceROI}
                cashFlowForecast={cashFlowForecast}
                locationMetrics={locationMetrics}
                technicianMetrics={technicianMetrics}
                companyMetrics={companyMetrics}
                technicians={technicians}
                pipelineAnalytics={pipelineAnalytics}
                businessHealthData={businessHealthData}
                pipelineForecastData={pipelineForecastData}
                teamPerformanceData={teamPerformanceData}
                capacityPlanningData={capacityPlanningData}
                onViewProject={onViewProject}
              />
            )}

            {/* Reports Section */}
            {activeSection === 'reports' && (
              <ReportsSection />
            )}

            {/* Expenses Section */}
            {activeSection === 'expenses' && (
              <motion.div
                key="expenses"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <ExpenseList />
              </motion.div>
            )}

            {/* Support Section */}
            {activeSection === 'support' && (
              <SupportSection
                profile={profile}
                onProfileChange={onProfileChange}
                pricing={pricing}
                onPricingChange={onPricingChange}
                customPricing={customPricing}
                onCustomPricingChange={onCustomPricingChange}
                fixtureCatalog={fixtureCatalog}
                onFixtureCatalogChange={onFixtureCatalogChange}
                colorTemp={colorTemp}
                onColorTempChange={onColorTempChange}
                lightIntensity={lightIntensity}
                onLightIntensityChange={onLightIntensityChange}
                darknessLevel={darknessLevel}
                onDarknessLevelChange={onDarknessLevelChange}
                beamAngle={beamAngle}
                onBeamAngleChange={onBeamAngleChange}
                theme={theme}
                onThemeChange={onThemeChange}
                accentColor={accentColor}
                onAccentColorChange={onAccentColorChange}
                fontSize={fontSize}
                onFontSizeChange={onFontSizeChange}
                highContrast={highContrast}
                onHighContrastChange={onHighContrastChange}
                notifications={notifications}
                onNotificationsChange={onNotificationsChange}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
