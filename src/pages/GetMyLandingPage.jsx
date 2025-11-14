import { Link } from "react-router-dom";
import HubHamburger from "../components/HubHamburger.jsx";

export default function GetMyLandingPage() {
  return (
    <div className="min-h-screen text-white">
      {/* Page header: shared hamburger */}
      <HubHamburger />

      <main className="px-6 pb-24">
        <section className="text-center mt-24">
          <img src="/logo.png" alt="MF" className="mx-auto h-24 w-24 mb-6" />
          <h1 className="text-3xl font-bold mb-2">Get My Landing Page</h1>
          <p className="text-white/70 mb-6">
            This is where Momentum agents will set up and manage their recruiting
            landing page. Log in with your agent account to continue.
          </p>
          <div className="flex gap-3 justify-center">
            {/* Use the new agent-specific login */}
            <Link className="btn btn-primary" to="/login-agent">
              Login
            </Link>
            <Link className="btn" to="/signup">
              Sign up with code
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
