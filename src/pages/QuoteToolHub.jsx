// File: src/pages/QuoteToolHub.jsx
import HubHamburger from "../components/HubHamburger.jsx";
import QuoteTool from "./QuoteTool.jsx";

export default function QuoteToolHub() {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      <HubHamburger />
      <main className="px-4 pb-24">
        <QuoteTool /> {/* header ON here */}
      </main>
    </div>
  );
}
