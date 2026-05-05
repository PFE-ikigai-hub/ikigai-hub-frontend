// Ce fichier gere une partie du frontend.
import { Suspense, lazy, type ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { RequireAuth, RequireRole } from "./guards";
import Preloader from "@/shared/components/feedback/Preloader";
import { SplashScreen } from "@/shared/components/ui/SplashScreen";
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";
import Prism from "@/shared/components/effects/Prism";
import type { UserRole } from "@/types/auth";

// Les pages sont chargees a la demande pour alleger le premier chargement.
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

const ClientDashboardPage = lazy(() => import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientDashboardPage })));
const ClientReviewPage = lazy(() => import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientReviewPage })));
const ClientReviewDetailPage = lazy(() => import("@/modules/client/pages/ReviewDetailPage").then((m) => ({ default: m.ClientReviewDetailPage })));
const ClientValidatedPage = lazy(() => import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientValidatedPage })));
const ClientArchivedPage = lazy(() => import("@/modules/client/pages/DashboardPage").then((m) => ({ default: m.ClientArchivedPage })));

const EmployeeDashboardPage = lazy(() => import("@/modules/employee/pages/DashboardPage").then((m) => ({ default: m.EmployeeDashboardPage })));
const EmployeeProjectsPage = lazy(() => import("@/modules/employee/pages/DashboardPage").then((m) => ({ default: m.EmployeeProjectsPage })));
const EmployeeUploadPage = lazy(() => import("@/modules/employee/pages/DashboardPage").then((m) => ({ default: m.EmployeeUploadPage })));
const EmployeeFeedbackPage = lazy(() => import("@/modules/employee/pages/FeedbackPage").then((m) => ({ default: m.EmployeeFeedbackPage })));
const EmployeeProjectDetailPage = lazy(() => import("@/modules/employee/pages/ProjectDetailPage").then((m) => ({ default: m.EmployeeProjectDetailPage })));
const EmployeeFeedbackDetailPage = lazy(() => import("@/modules/employee/pages/FeedbackDetailPage").then((m) => ({ default: m.EmployeeFeedbackDetailPage })));

// Ce loader plein ecran sert pendant les chargements importants.
function FullScreenLoader({ size = 0.9 }: { size?: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-[#0a0a0b] relative overflow-hidden">
      <Preloader size={size} />
    </div>
  );
}

// Cet ecran couvre la phase d'initialisation de la session.
function AuthInitializingScreen() {
  const { isLoading } = useAuth();
  return (
    <SplashScreen isLoading={isLoading}>
      <FullScreenLoader size={0.9} />
    </SplashScreen>
  );
}

// Cet ecran leger est reserve a la page de connexion.
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

// Cette fonction choisit la page d'accueil selon le role.
function roleDefaultPath(role: UserRole | null) {
  if (role === "ADMIN") return "/admin/users";
  if (role === "CLIENT") return "/client/dashboard";
  return "/employee/dashboard";
}

// Ce composant redirige vers la page par defaut du role.
function RoleRedirect({ role }: { role: UserRole | null }) {
  return <Navigate to={roleDefaultPath(role)} replace />;
}

// Ce composant joue l'ecran de transition apres connexion si besoin.
function PostLoginSplashGate({ role }: { role: UserRole | null }) {
  let shouldShow = false;
  try {
    shouldShow = sessionStorage.getItem("ikigai:postLoginSplash") === "1";
    if (shouldShow) {
      sessionStorage.removeItem("ikigai:postLoginSplash");
    }
  } catch {
    shouldShow = false;
  }

  if (!shouldShow) return <RoleRedirect role={role} />;

  return (
    <SplashScreen isLoading={false}>
      <RoleRedirect role={role} />
    </SplashScreen>
  );
}

// Cette redirection decide quoi afficher a la racine de l'application.
function RootRedirect() {
  const { role, isAuthenticated, isLoading, isFullyReady } = useAuth();
  if (isLoading || (isAuthenticated && !isFullyReady)) return <AuthInitializingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <PostLoginSplashGate role={role} />;
}

// Cette route gere le cas particulier de la page login.
function LoginRoute() {
  const { isLoading, isAuthenticated, isFullyReady } = useAuth();
  if (isLoading) return <LoginLoadingScreen />;
  if (isAuthenticated && !isFullyReady) return <AuthInitializingScreen />;
  if (isAuthenticated) return <RootRedirect />;
  return <LoginPage />;
}

// Ce wrapper applique la protection par role.
function ProtectedRoute({ role, element }: { role: UserRole; element: ReactElement }) {
  return <RequireRole role={role}>{element}</RequireRole>;
}

// Ce routeur central declare toutes les routes publiques et privees.
export function AppRouter() {
  const { isLoading } = useAuth();
  const suspenseFallback = isLoading ? <AuthInitializingScreen /> : <FullScreenLoader size={0.8} />;

  return (
    <Suspense fallback={suspenseFallback}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/redirect/project/:projectId" element={<ProjectRedirector />} />
        <Route path="/redirect/deliverable/:deliverableId" element={<DeliverableRedirector />} />
        <Route path="/" element={<RootRedirect />} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/admin/dashboard" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<ProtectedRoute role="ADMIN" element={<AdminUsersPage />} />} />
          <Route path="/admin/projects" element={<ProtectedRoute role="ADMIN" element={<AdminProjectsPage />} />} />
          <Route path="/admin/projects/:projectId" element={<ProtectedRoute role="ADMIN" element={<AdminProjectDetailPage />} />} />
          <Route path="/admin/deliverables" element={<ProtectedRoute role="ADMIN" element={<AdminDeliverablesPage />} />} />
          <Route path="/admin/deliverables/:deliverableId" element={<ProtectedRoute role="ADMIN" element={<AdminDeliverableDetailPage />} />} />

          <Route path="/client/dashboard" element={<ProtectedRoute role="CLIENT" element={<ClientDashboardPage />} />} />
          <Route path="/client/review" element={<ProtectedRoute role="CLIENT" element={<ClientReviewPage />} />} />
          <Route path="/client/review/:deliverableId" element={<ProtectedRoute role="CLIENT" element={<ClientReviewDetailPage />} />} />
          <Route path="/client/validated" element={<ProtectedRoute role="CLIENT" element={<ClientValidatedPage />} />} />
          <Route path="/client/archived" element={<ProtectedRoute role="CLIENT" element={<ClientArchivedPage />} />} />

          <Route path="/employee/dashboard" element={<ProtectedRoute role="EMPLOYE" element={<EmployeeDashboardPage />} />} />
          <Route path="/employee/projects" element={<ProtectedRoute role="EMPLOYE" element={<EmployeeProjectsPage />} />} />
          <Route path="/employee/projects/:projectId" element={<ProtectedRoute role="EMPLOYE" element={<EmployeeProjectDetailPage />} />} />
          <Route path="/employee/upload" element={<ProtectedRoute role="EMPLOYE" element={<EmployeeUploadPage />} />} />
          <Route path="/employee/feedback" element={<ProtectedRoute role="EMPLOYE" element={<EmployeeFeedbackPage />} />} />
          <Route path="/employee/feedback/:deliverableId" element={<ProtectedRoute role="EMPLOYE" element={<EmployeeFeedbackDetailPage />} />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}
