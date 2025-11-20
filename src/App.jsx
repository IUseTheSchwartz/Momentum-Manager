// File: src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Public pages
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import MomentumLeadManager from "./pages/MomentumLeadManager.jsx";
import GetMyLandingPage from "./pages/GetMyLandingPage.jsx";
import AgentLogin from "./pages/AgentLogin.jsx";
import AgentPublicLanding from "./pages/AgentPublicLanding.jsx";

// Agent site pages
import MyLandingPage from "./pages/MyLandingPage.jsx";
import AgentSettings from "./pages/AgentSettings.jsx";
import AgentQuestions from "./pages/AgentQuestions.jsx";
import AgentLeads from "./pages/AgentLeads.jsx";
import AgentAvailability from "./pages/AgentAvailability.jsx";

// Auth'd pages
import Leads from "./pages/Leads.jsx";

// 🔹 NEW: Trade Center page (for all authed users)
import TradeCenter from "./pages/TradeCenter.jsx";

// 🔹 NEW: Quote Tool page (for all authed users)
import QuoteTool from "./pages/QuoteTool.jsx";

// Manager pages (gated)
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ManagerImports from "./pages/ManagerImports.jsx";
import ManagerLeads from "./pages/ManagerLeads.jsx";
import ManagerInvites from "./pages/ManagerInvites.jsx";
import ManagerMembers from "./pages/ManagerMembers.jsx";

// Booking flow shells (public)
import Schedule from "./pages/Schedule.jsx";
import ThankYou from "./pages/ThankYou.jsx";
import Reschedule from "./pages/Reschedule.jsx";

// Debug page
import Me from "./pages/Me.jsx";

// Shell
import Nav from "./components/Nav.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RoleGate from "./components/RoleGate.jsx";

export default function App() {
  const location = useLocation();
  const path = location.pathname;

  // Public agent landing is any single-segment path ("/something")
  // that isn't one of our known app routes.
  const knownPaths = new Set([
    "/",
    "/login",
    "/login-agent",
    "/signup",
    "/momentum-lead-manager",
    "/get-my-landing-page",
    "/me",
    "/leads",
    "/trades", // 🔹 Trade Center is a known app route
    "/quote-tool", // 🔹 NEW: Quote Tool route
    "/manager",
    "/manager/imports",
    "/manager/leads",
    "/manager/invites",
    "/manager/members",
    "/my-landing-page",
    "/my-landing-page/questions",
    "/my-landing-page/leads",
    "/my-landing-page/availability",
    // booking-related public pages
    "/schedule",
    "/thank-you",
    "/reschedule",
  ]);

  const isSingleSegment = /^\/[^/]+$/.test(path);
  const isPublicAgentLanding = isSingleSegment && !knownPaths.has(path);

  // Also treat booking flow shells as "public shell" pages with no app Nav
  const PUBLIC_SHELL_PATHS = new Set(["/schedule", "/thank-you", "/reschedule"]);
  const isPublicShell = isPublicAgentLanding || PUBLIC_SHELL_PATHS.has(path);

  const routes = (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login-agent" element={<AgentLogin />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/momentum-lead-manager"
        element={<MomentumLeadManager />}
      />
      <Route path="/get-my-landing-page" element={<GetMyLandingPage />} />

      {/* Booking flow shells (public, shared across agents) */}
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/thank-you" element={<ThankYou />} />
      <Route path="/reschedule" element={<Reschedule />} />

      {/* Public agent landing (/:slug) */}
      <Route path="/:slug" element={<AgentPublicLanding />} />

      {/* Debug */}
      <Route path="/me" element={<Me />} />

      {/* Auth required */}
      <Route element={<ProtectedRoute />}>
        <Route path="/leads" element={<Leads />} />

        {/* 🔹 Trade Center (any authed user: agent or manager) */}
        <Route path="/trades" element={<TradeCenter />} />

        {/* 🔹 Quote Tool (any authed user: agent or manager) */}
        <Route path="/quote-tool" element={<QuoteTool />} />

        {/* Agent site (tabbed) */}
        <Route path="/my-landing-page" element={<MyLandingPage />}>
          <Route index element={<AgentSettings />} />
          <Route path="questions" element={<AgentQuestions />} />
          <Route path="leads" element={<AgentLeads />} />
          <Route path="availability" element={<AgentAvailability />} />
        </Route>

        {/* Manager-only */}
        <Route element={<RoleGate role="manager" />}>
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/imports" element={<ManagerImports />} />
          <Route path="/manager/leads" element={<ManagerLeads />} />
          <Route path="/manager/invites" element={<ManagerInvites />} />
          <Route path="/manager/members" element={<ManagerMembers />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <div className="min-h-screen">
      {/* Hide Nav on public agent landing + booking shell pages */}
      {!isPublicShell && <Nav />}

      {/* Public shells render full-bleed; app pages use centered container */}
      {isPublicShell ? (
        routes
      ) : (
        <div className="max-w-6xl mx-auto p-4">{routes}</div>
      )}
    </div>
  );
}
