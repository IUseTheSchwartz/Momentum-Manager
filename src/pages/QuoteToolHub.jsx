// File: src/pages/QuoteToolHub.jsx
import HubHamburger from "../components/HubHamburger.jsx";
import QuoteTool from "./QuoteTool.jsx";

export default function QuoteToolHub() {
  return (
    <div className="min-h-screen text-white bg-[#0b0b0c]">
      {/* Hamburger header only */}
      <HubHamburger />

      <main className="px-4 pb-24">
        <QuoteTool />
      </main>
    </div>
  );
}
