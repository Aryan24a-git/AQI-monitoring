// Satisfies: REQ-001, REQ-002, REQ-003, REQ-004, REQ-007, REQ-010, REQ-015
'use client';

import React from 'react';
import { ToastProvider } from '@/features/layout/ToastContainer';
import { useVayuSaathi } from '@/features/layout/useVayuSaathi';
import { useAppActions } from '@/features/layout/useAppActions';
import { TopHeader } from '@/features/layout/TopHeader';
import { MobileNav } from '@/features/layout/MobileNav';
import { AppFooter } from '@/features/layout/AppFooter';
import { HeroSection } from '@/features/hero/HeroSection';
import { LandingEmptyState } from '@/features/hero/LandingEmptyState';
import { DailyPlaybookTab } from '@/features/playbook/DailyPlaybookTab';
import { CopilotTab } from '@/features/copilot/CopilotTab';
import { AiConsentModal } from '@/features/copilot/AiConsentModal';
import { CommunityTab } from '@/features/community/CommunityTab';
import { ProfileDrawer } from '@/features/profile/ProfileDrawer';

function VayuSaathiApp() {
  const state = useVayuSaathi();
  const actions = useAppActions(state);
  const userCo2 = state.completedIds.length * 0.35;
  const ready = state.location && state.impact && state.playbook;

  return (
    <div className="font-sans antialiased overflow-x-hidden pb-24 md:pb-12 bg-[#F7F6F2] min-h-screen">
      <TopHeader
        activeLocation={state.location}
        profile={state.profile}
        activeTab={state.activeTab}
        onTabChange={state.setActiveTab}
        onOpenProfile={() => state.setIsProfileOpen(true)}
        onFetchLiveCity={state.loadLiveCity}
      />

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {state.location?.isSynthetic && (
          <div
            role="status"
            className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-2.5 text-xs font-semibold text-amber-900 flex items-center justify-between gap-2"
          >
            <span>Demo scenario (synthetic data) — not live station telemetry.</span>
            <button
              type="button"
              onClick={state.clearAllData}
              className="underline hover:text-amber-950"
            >
              Switch to live city
            </button>
          </div>
        )}

        {!ready || state.isLoadingCity ? (
          <LandingEmptyState
            isLoading={state.isLoadingCity}
            error={state.cityError}
            lastCityQuery={state.lastCityQuery}
            onFetchCity={state.loadLiveCity}
            onUseGeolocation={actions.handleUseGeolocation}
            onManualPm25={actions.handleManualPm25}
          />
        ) : (
          <>
            <HeroSection location={state.location!} impact={state.impact!} vent={state.vent} />

            {state.activeTab === 'playbook' && (
              <DailyPlaybookTab
                playbook={state.playbook!}
                impact={state.impact!}
                completedIds={state.completedIds}
                playbookSource={state.playbookSource}
                isGeneratingAI={state.isGeneratingAI}
                onTogglePledge={state.togglePledge}
                onGenerateAI={actions.handleGenerateAI}
              />
            )}

            {state.activeTab === 'copilot' && (
              <CopilotTab
                location={state.location!}
                profile={state.profile}
                vent={state.vent}
                messages={state.chatMessages}
                onSendMessage={actions.handleSendMessage}
                onResetChat={() => state.initGreeting(state.location!)}
                isLoading={state.isChatLoading}
              />
            )}

            {state.activeTab === 'community' && (
              <CommunityTab
                location={state.location!}
                profile={state.profile}
                vent={state.vent}
                impact={state.impact!}
                completedPledgesCount={state.completedIds.length}
                userCo2Kg={userCo2}
                hotspots={state.hotspots}
                upvotedIds={state.upvotedIds}
                onAddHotspot={state.addHotspot}
                onToggleUpvote={state.toggleUpvote}
                onRemoveHotspot={state.removeHotspot}
              />
            )}
          </>
        )}
      </main>

      <AppFooter />
      <MobileNav activeTab={state.activeTab} onTabChange={state.setActiveTab} />

      <ProfileDrawer
        isOpen={state.isProfileOpen}
        onClose={() => state.setIsProfileOpen(false)}
        profile={state.profile}
        onSaveProfile={state.handleSaveProfile}
        onClearData={state.clearAllData}
      />

      {actions.pendingAction && (
        <AiConsentModal
          onAllow={() => void actions.handleConsentChoice('allow')}
          onDecline={() => void actions.handleConsentChoice('basic')}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <ToastProvider>
      <VayuSaathiApp />
    </ToastProvider>
  );
}
