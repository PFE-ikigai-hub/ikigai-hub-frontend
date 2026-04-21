import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { RequireAuth, RequireRole } from "./guards";
import Preloader from "@/shared/components/feedback/Preloader";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";
import Prism from "@/shared/components/effects/Prism";

const AppShell = lazy(() => import("@/shared/layout/AppShell").then((m) => ({ default: m.AppShell })));
const LoginPage = lazy(() => import("@/modules/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() => import("@/modules/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const SettingsPage = lazy(() => import("@/modules/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProjectRedirector = lazy(() => import("@/shared/components/routing/ProjectRedirector").then((m) => ({ default: m.ProjectRedirector })));
const DeliverableRedirector = lazy(() => import("@/shared/components/routing/DeliverableRedirector").then((m) => ({ default: m.DeliverableRedirector })));

const AdminUsersPage = lazy(() => import("@/modules/admin/pages/UsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminProjectsPage = lazy(() => import("@/modules/admin/pages/ProjectsPage").then((m) => ({ default: m.AdminProjectsPage })));
const AdminProjectDetailPage = lazy(() => import("@/modules/admin/pages/ProjectDetailPage").then((m) => ({ default: m.AdminProjectDetailPage })));
const AdminDeliverablesPage = lazy(() => import("@/modules/admin/pages/DeliverablesPage").then((m) => ({ default: m.AdminDeliverablesPage })));
const AdminDeliverableDetailPage = lazy(() => import("@/modules/admin/pages/DeliverableDetailPage").then((m) => ({ default: m.AdminDeliverableDetailPage })));

const ClientDashboardPage = lazy(() =>
  import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientDashboardPage }))
);
const ClientReviewPage = lazy(() =>
  import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientReviewPage }))
);
const ClientReviewDetailPage = lazy(() =>
  import("@/modules/client/pages/ReviewDetailPage").then((m) => ({ default: m.ClientReviewDetailPage }))
);
const ClientValidatedPage = lazy(() =>
  import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientValidatedPage }))
);
const ClientArchivedPage = lazy(() =>
  import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientArchivedPage }))
);

const EmployeeDashboardPage = lazy(() =>
  import("@/modules/employee/pages/DashboardPage").then((m) => ({ default: m.EmployeeDashboardPage }))
);
const EmployeeProjectsPage = lazy(() =>
  import("@/modules/employee/pages/DashboardPage").then((m) => ({ default: m.EmployeeProjectsPage }))
);
const EmployeeUploadPage = lazy(() =>
  import("@/modules/employee/pages/DashboardPage").then((m) => ({ default: m.EmployeeUploadPage }))
);
const EmployeeFeedbackPage = lazy(() =>
  import("@/modules/employee/pages/FeedbackPage").then((m) => ({ default: m.EmployeeFeedbackPage }))
);
const EmployeeProjectDetailPage = lazy(() =>
  import("@/modules/employee/pages/ProjectDetailPage").then((m) => ({ default: m.EmployeeProjectDetailPage }))
);
const EmployeeFeedbackDetailPage = lazy(() =>
  import("@/modules/employee/pages/FeedbackDetailPage").then((m) => ({ default: m.EmployeeFeedbackDetailPage }))
);

function LoadingBackgroundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b] relative overflow-hidden">
      <Preloader size={0.9} />
    </div>
  );
}

function AuthInitializingScreen() {
  const { isLoading } = useAuth();
  return (
    <SplashScreen isLoading={isLoading}>
      <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b] relative overflow-hidden">
        <Preloader size={0.9} />
      </div>
    </SplashScreen>
  );
}

// Simple loading screen for login page - no SplashScreen, just Prism + colored spinner
function LoginLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0b]">
      <div className="absolute inset-0 z-0">
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div>
      <div className="relative z-10">
        <PreloaderIndicator size={1.5} />
      </div>
    </div>
  );
}

function RootRedirect() {
  const { role, isAuthenticated, isLoading, isFullyReady } = useAuth();
  if (isLoading || (isAuthenticated && !isFullyReady)) return <AuthInitializingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <PostLoginSplashGate role={role} />;
}

function RoleRedirect({ role }: { role: "ADMIN" | "CLIENT" | "EMPLOYE" | null }) {
  if (role === "ADMIN") return <Navigate to="/admin/users" replace />;
  if (role === "CLIENT") return <Navigate to="/client/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

function PostLoginSplashGate({ role }: { role: "ADMIN" | "CLIENT" | "EMPLOYE" | null }) {
  let shouldShow = false;
  try {
    shouldShow = sessionStorage.getItem("ikigai:postLoginSplash") === "1";
    if (shouldShow) {
      sessionStorage.removeItem("ikigai:postLoginSplash");
    }
  } catch {
    shouldShow = false;
  }

  if (!shouldShow) {
    return <RoleRedirect role={role} />;
  }

  return (
    <SplashScreen isLoading={false}>
      <RoleRedirect role={role} />
    </SplashScreen>
  );
}

function LoginRoute() {
  const { isLoading, isAuthenticated, isFullyReady } = useAuth();
  // For login page, show simple Prism background + spinner (NOT the SplashScreen with "Ikigai Hub")
  if (isLoading) return <LoginLoadingScreen />;
  if (isAuthenticated && !isFullyReady) return <AuthInitializingScreen />;
  if (isAuthenticated) return <RootRedirect />;
  return <LoginPage />;
}

export function AppRouter() {
  const { isLoading } = useAuth();
  const suspenseFallback = isLoading
    ? <AuthInitializingScreen />
    : (
      <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b]">
        <Preloader size={0.8} />
      </div>
    );

  return (
    <Suspense fallback={suspenseFallback}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/redirect/project/:projectId" element={<ProjectRedirector />} />
        <Route path="/redirect/deliverable/:deliverableId" element={<DeliverableRedirector />} />
        <Route path="/" element={<RootRedirect />} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          {/* Admin */}
          <Route path="/admin/dashboard" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<RequireRole role="ADMIN"><AdminUsersPage /></RequireRole>} />
          <Route path="/admin/projects" element={<RequireRole role="ADMIN"><AdminProjectsPage /></RequireRole>} />
          <Route path="/admin/projects/:projectId" element={<RequireRole role="ADMIN"><AdminProjectDetailPage /></RequireRole>} />
          <Route path="/admin/deliverables" element={<RequireRole role="ADMIN"><AdminDeliverablesPage /></RequireRole>} />
          <Route path="/admin/deliverables/:deliverableId" element={<RequireRole role="ADMIN"><AdminDeliverableDetailPage /></RequireRole>} />

          {/* Client */}
          <Route path="/client/dashboard" element={<RequireRole role="CLIENT"><ClientDashboardPage /></RequireRole>} />
          <Route path="/client/review" element={<RequireRole role="CLIENT"><ClientReviewPage /></RequireRole>} />
          <Route path="/client/review/:deliverableId" element={<RequireRole role="CLIENT"><ClientReviewDetailPage /></RequireRole>} />
          <Route path="/client/validated" element={<RequireRole role="CLIENT"><ClientValidatedPage /></RequireRole>} />
          <Route path="/client/archived" element={<RequireRole role="CLIENT"><ClientArchivedPage /></RequireRole>} />

          {/* Employee */}
          <Route path="/employee/dashboard" element={<RequireRole role="EMPLOYE"><EmployeeDashboardPage /></RequireRole>} />
          <Route path="/employee/projects" element={<RequireRole role="EMPLOYE"><EmployeeProjectsPage /></RequireRole>} />
          <Route path="/employee/projects/:projectId" element={<RequireRole role="EMPLOYE"><EmployeeProjectDetailPage /></RequireRole>} />
          <Route path="/employee/upload" element={<RequireRole role="EMPLOYE"><EmployeeUploadPage /></RequireRole>} />
          <Route path="/employee/feedback" element={<RequireRole role="EMPLOYE"><EmployeeFeedbackPage /></RequireRole>} />
          <Route path="/employee/feedback/:deliverableId" element={<RequireRole role="EMPLOYE"><EmployeeFeedbackDetailPage /></RequireRole>} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}
