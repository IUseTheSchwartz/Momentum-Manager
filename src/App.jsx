// File: src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Public pages
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

// Auth'd pages
import Leads from "./pages/Leads.jsx";
import GetMyLandingPage from "./pages/GetMyLandingPage.jsx";
import MomentumLeadManager from "./pages/MomentumLeadManager.jsx";

// Manager pages (gated)
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ManagerImports from "./pages/ManagerImports.jsx";
import ManagerLeads from "./pages/ManagerLeads.jsx";
import ManagerInvites from "./pages/ManagerInvites.jsx";
import ManagerMembers from "./pages/ManagerMembers.jsx";

// Debug page (optional, helps verify role)
import Me from "./pages/Me.jsx";

// Shell
import Nav from "./components/Nav.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RoleGate from "./components/RoleGate.jsx";

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-6xl mx-auto p-4">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Debug */}
          <Route path="/me" element={<Me />} />

          {/* Auth required */}
          <Route element={<ProtectedRoute />}>
            <Route path="/leads" element={<Leads />} />
            <Route
              path="/get-my-landing-page"
              element={<GetMyLandingPage />}
            />
            <Route
              path="/momentum-lead-manager"
              element={<MomentumLeadManager />}
            />

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
      </div>
    </div>
  );
}
