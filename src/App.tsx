import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/hooks/useAuth";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PublicRequestLayout } from "@/components/layout/PublicRequestLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";

import LandingPage from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import PricingPage from "@/pages/Pricing";
import ForgotPasswordPage from "@/pages/ForgotPassword";
import ResetPasswordPage from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

import OnboardingPage from "@/features/workspace/pages/OnboardingPage";
import DashboardPage from "@/features/workspace/pages/DashboardPage";
import BrandSettingsPage from "@/features/workspace/pages/BrandSettingsPage";
import TeamSettingsPage from "@/features/workspace/pages/TeamSettingsPage";
import BillingSettingsPage from "@/features/billing/pages/BillingSettingsPage";
import RequestsInboxPage from "@/features/requests/pages/RequestsInboxPage";
import CreateRequestPage from "@/features/requests/pages/CreateRequestPage";
import RequestDetailPage from "@/features/requests/pages/RequestDetailPage";
import SubmissionReviewPage from "@/features/submissions/pages/SubmissionReviewPage";
import GuideLibraryPage from "@/features/guides/pages/GuideLibraryPage";
import GuideBuilderPage from "@/features/guides/pages/GuideBuilderPage";
import GuideDetailPage from "@/features/guides/pages/GuideDetailPage";
import PublicRecipientPage from "@/features/capture/pages/PublicRecipientPage";
import RecipientConfirmationPage from "@/features/capture/pages/RecipientConfirmationPage";
import AcceptInvitePage from "@/features/workspace/pages/AcceptInvitePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          {/* Marketing + auth */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            <Route path="/settings/billing" element={<BillingSettingsPage />} />
          </Route>

          {/* Public recipient (chat-first, no auth) */}
          <Route element={<PublicRequestLayout />}>
            <Route path="/r/:token" element={<PublicRecipientPage />} />
            <Route path="/r/:token/done" element={<RecipientConfirmationPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
