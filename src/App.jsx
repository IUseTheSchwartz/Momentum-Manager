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
// ❌ AgentProof removed
import AgentLeads from "./pages/AgentLeads.jsx";
import AgentAvailability from "./pages/AgentAvailability.jsx";

// Auth'd pages
import Leads from "./pages/Leads.jsx";

// Manager pages (gated)
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ManagerImports from "./pages/ManagerImports.jsx";
import ManagerLeads from "./pages/ManagerLeads.jsx";
import ManagerInvites from "./pages/ManagerInvites.jsx";
import ManagerMembers from "./pages/ManagerMembers.jsx";

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
    "/manager",
    "/manager/imports",
    "/manager/leads",
    "/manager/invites",
    "/manager/members",
    "/my-landing-page",
    "/my-landing-page/questions",
    // "/my-landing-page/proof", // ❌ no longer a route
    "/my-landing-page/leads",
    "/my-landing-page/availability",
  ]);

  const isSingleSegment = /^\/[^/]+$/.test(path);
  const isPublicAgentLanding = isSingleSegment && !knownPaths.has(path);

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

      {/* Public agent landing (/:slug) */}
      <Route path="/:slug" element={<AgentPublicLanding />} />

      {/* Debug */}
      <Route path="/me" element={<Me />} />

      {/* Auth required */}
      <Route element={<ProtectedRoute />}>
        <Route path="/leads" element={<Leads />} />

        {/* Agent site (tabbed) */}
        <Route path="/my-landing-page" element={<MyLandingPage />}>
          <Route index element={<AgentSettings />} />
          <Route path="questions" element={<AgentQuestions />} />
          {/* ❌ proof tab route removed */}
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
      {/* Hide Nav on public agent landing pages */}
      {!isPublicAgentLanding && <Nav />}

      {/* For public agent pages, no container so the page can be full-bleed */}
      {isPublicAgentLanding ? (
        routes
      ) : (
        <div className="max-w-6xl mx-auto p-4">{routes}</div>
      )}
    </div>
  );
}
