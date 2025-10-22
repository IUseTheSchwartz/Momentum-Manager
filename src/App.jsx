import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Leads from "./pages/Leads.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ManagerImports from "./pages/ManagerImports.jsx";
import ManagerLeads from "./pages/ManagerLeads.jsx";
import ManagerInvites from "./pages/ManagerInvites.jsx";
import ManagerMembers from "./pages/ManagerMembers.jsx";
import Nav from "./components/Nav.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RoleGate from "./components/RoleGate.jsx";

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-6xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/leads" element={<Leads />} />

            <Route element={<RoleGate role="manager" />}>
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/imports" element={<ManagerImports />} />
              <Route path="/manager/leads" element={<ManagerLeads />} />
              <Route path="/manager/invites" element={<ManagerInvites />} />
              <Route path="/manager/members" element={<ManagerMembers />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}
