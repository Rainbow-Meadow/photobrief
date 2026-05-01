import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CurrentWorkspaceProvider } from "@/hooks/useCurrentWorkspace";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PublicRequestLayout } from "@/components/layout/PublicRequestLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RouteTracker } from "@/components/analytics/RouteTracker";

// Eager: marketing + auth + recipient capture. These are the entry points
// for unauthenticated visitors and the public recipient flow, so they stay
// in the main bundle to avoid a Suspense flash on first paint.
import LandingPage from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import PricingPage from "@/pages/Pricing";
import ForAiAgentsPage from "@/pages/ForAiAgents";
import ForgotPasswordPage from "@/pages/ForgotPassword";
import ResetPasswordPage from "@/pages/ResetPassword";
import UnsubscribePage from "@/pages/Unsubscribe";
import WaitlistPage from "@/pages/Waitlist";
import SignupPage from "@/pages/Signup";
import BetaInvitePage from "@/pages/BetaInvite";
import NotFound from "@/pages/NotFound";
import PublicRecipientPage from "@/features/capture/pages/PublicRecipientPage";
import RecipientConfirmationPage from "@/features/capture/pages/RecipientConfirmationPage";

import { RequirePlatformAdmin } from "@/components/auth/RequirePlatformAdmin";
import { InviteAcceptanceGuard } from "@/components/auth/InviteAcceptanceGuard";

// Lazy: authenticated business app + onboarding + help. These pages are only
// reachable after sign-in, so splitting them out of the initial bundle removes
// ~hundreds of KB of script-eval/parse work from the marketing landing page
// without changing any UX (RequireAuth + Suspense fallback covers transitions).
const OnboardingPage = lazy(() => import("@/features/workspace/pages/OnboardingPage"));
const DashboardPage = lazy(() => import("@/features/workspace/pages/DashboardPage"));
const BrandSettingsPage = lazy(() => import("@/features/workspace/pages/BrandSettingsPage"));
const TeamSettingsPage = lazy(() => import("@/features/workspace/pages/TeamSettingsPage"));
const MessageTemplatesPage = lazy(() => import("@/features/workspace/pages/MessageTemplatesPage"));
const SmsSettingsPage = lazy(() => import("@/features/workspace/pages/SmsSettingsPage"));
const BillingSettingsPage = lazy(() => import("@/features/billing/pages/BillingSettingsPage"));
const RequestsInboxPage = lazy(() => import("@/features/requests/pages/RequestsInboxPage"));
const CreateRequestPage = lazy(() => import("@/features/requests/pages/CreateRequestPage"));
const RequestDetailPage = lazy(() => import("@/features/requests/pages/RequestDetailPage"));
const SubmissionReviewPage = lazy(() => import("@/features/submissions/pages/SubmissionReviewPage"));
const GuideLibraryPage = lazy(() => import("@/features/guides/pages/GuideLibraryPage"));
const GuideBuilderPage = lazy(() => import("@/features/guides/pages/GuideBuilderPage"));
const GuideDetailPage = lazy(() => import("@/features/guides/pages/GuideDetailPage"));
const AcceptInvitePage = lazy(() => import("@/features/workspace/pages/AcceptInvitePage"));
const BetaGuidePage = lazy(() => import("@/features/help/pages/BetaGuidePage"));
const AdminInvitesPage = lazy(() => import("@/pages/AdminInvites"));
const AdminAIRerunPage = lazy(() => import("@/pages/AdminAIRerun"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <CurrentWorkspaceProvider>
          <RouteTracker />
          <InviteAcceptanceGuard>
          <Suspense fallback={null}>
          <Routes>
          {/* Marketing + auth */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/for-ai-agents" element={<ForAiAgentsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/help" element={<BetaGuidePage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/beta-invite/:token" element={<BetaInvitePage />} />
          </Route>

          {/* Onboarding + invite acceptance (no sidebar, but still auth-only).
              Onboarding intentionally skips the onboarding gate to avoid loops. */}
          <Route element={<MarketingLayout />}>
            <Route
              path="/onboarding"
              element={
                <RequireAuth requireOnboarding={false}>
                  <OnboardingPage />
                </RequireAuth>
              }
            />
            <Route
              path="/invite/:token"
              element={
                <RequireAuth requireOnboarding={false}>
                  <AcceptInvitePage />
                </RequireAuth>
              }
            />
          </Route>

          {/* Authenticated business app */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/requests" element={<RequestsInboxPage />} />
            <Route path="/requests/new" element={<CreateRequestPage />} />
            <Route path="/requests/:id" element={<RequestDetailPage />} />
            <Route path="/submissions/:id" element={<SubmissionReviewPage />} />
            <Route path="/guides" element={<GuideLibraryPage />} />
            <Route path="/guides/new" element={<GuideBuilderPage />} />
            <Route path="/guides/:id" element={<GuideDetailPage />} />
            <Route path="/settings/brand" element={<BrandSettingsPage />} />
            <Route path="/settings/team" element={<TeamSettingsPage />} />
            <Route path="/settings/templates" element={<MessageTemplatesPage />} />
            <Route path="/settings/sms" element={<SmsSettingsPage />} />
            <Route path="/settings/billing" element={<BillingSettingsPage />} />
            <Route path="/app/help" element={<BetaGuidePage />} />
            <Route
              path="/admin/invites"
              element={
                <RequireAuth requireOnboarding={false}>
                  <RequirePlatformAdmin>
                    <AdminInvitesPage />
                  </RequirePlatformAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/ai-rerun"
              element={
                <RequireAuth requireOnboarding={false}>
                  <RequirePlatformAdmin>
                    <AdminAIRerunPage />
                  </RequirePlatformAdmin>
                </RequireAuth>
              }
            />
          </Route>

          {/* Public recipient (chat-first, no auth) */}
          <Route element={<PublicRequestLayout />}>
            <Route path="/r/:token" element={<PublicRecipientPage />} />
            <Route path="/r/:token/done" element={<RecipientConfirmationPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </InviteAcceptanceGuard>
        </CurrentWorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
