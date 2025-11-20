// File: src/pages/QuoteTool.jsx
import HubHamburger from "../components/HubHamburger.jsx";

const carrierQuoteLinks = [
  { label: "AIG (Guaranteed) GIWL", href: "https://connext.corebridgefinancial.com" }, // 1
  { label: "AIG (Simple) SIWL", href: "https://rapid-rater.live.web.corebridgefinancial.com/Simplinowquoter" }, // 2
  { label: "AFLAC", href: "https://producerportal.aflac.com/" }, // 3
  { label: "AMERICO", href: "https://account.americoagent.com/Identity/Account/Login/?returnUrl=https%3a%2f%2ftools.americoagent.com%2f" }, // 4
  { label: "AETNA", href: "https://www.aetna.com/aimmanageaccount/login?identityTransaction=getzphCU0eHDYva%2FgD8kUvyDvAwzFXd%2BG3uZK1cJMwQZ6yiFetiv3feZBm3rWfIu%2F2rymlZICkWANNk5Qie6FkCuLf%2Fb9W68QkVOa9EP0Lfyv%2BUHsRt6TqAMyXi3udmsgcsPDYldZj1jrkMG%2BEE84krieenUDUP0LypCPQEkHKNk28aIDsxY88wSVzaXURxsKNnS1t1HvRU7qTuK8kCObkrQpnwNRINoFhx7qlaMNkAVCpu%2BUqmr1NmxNR17QakmBVs4%2FEh2N9sSzQVY3TT%2BJL5vUygt31X8YFTQTcKml2HNLR9x51Yli698%2B1WKaZLtGYsqLKQtuCZ5iaR3hSpjbmF8fnfL1PqBg7Wncvg9KQF44PFZcE%2FoGNf%2BXjChEtpK04m%2BQT5yDWSipZTPRANEHxVTtDoghVW%2B54TGzbTpCoS6%2BGaJNt9H8ndQCCWdXBdGb4YjN3EYkmWyogwJsIeQ4l1epunclAOsSmZzWd6PplYP53m0K1MK432SWnr52MVo4BOfBaX7IJAT06NIfcHPtht7e3h1XPPp%2Bk8ry4%2Brx2RZ6%2FsX9xs7b2y02NUiKklBap%2B1Romb0o6BSMATm7axqT1GuIgYONd9Nb2SDQN04kUFKvwiG%2BeNYyQRAWw4D7BqP2VfwStk5mc2xQCNUyJVKA%3D%3D&appname=SSIBroker&branding=aetna&skin=&language=&channel=web&psuid=&biometric_text=&businessdata=channel~aetna|subchannel~broker&business_event=Login" }, // 5
  { label: "AMERICAN AMICABLE", href: "https://www.insuranceapplication.com/AppPage/index.html" }, // 6
  { label: "FORESTERS", href: "https://www.forestersmobile.com/" }, // 7
  { label: "MUTUAL OF OMAHA", href: "https://www3.mutualofomaha.com/mobile-quotes/#/home" }, // 8
  { label: "PROSPERITY", href: "https://insuranceadmin.com/agent/login.php#" }, // 9
  { label: "TRANSAMERICA", href: "https://mytranswarequote.transamerica.com/Wl3.html?id=WL3IM" }, // 10
  { label: "Ethos", href: "https://agents.ethoslife.com/dashboard" }, // 11
];

const cheatSheetLinks = [
  { label: "Term Life Cheat Sheet", href: "https://www.fflamerica.com/_files/ugd/002d25_a57f8ca815a64a389f2190f4c1dd08a4.pdf" }, // 12
  { label: "Whole Life Cheat Sheet", href: "https://83cea077-ef69-458f-ac96-5ba721701b74.filesusr.com/ugd/002d25_42419a49ecfc45d6badcf6579cf9a375.pdf" }, // 13
];

const eAppLinks = [
  { label: "AIG (Guaranteed) GIWL", href: "https://connext.corebridgefinancial.com" }, // 14
  { label: "AIG (Simple) SIWL", href: "https://connext.corebridgefinancial.com" }, // 15
  { label: "Aetna", href: "https://www.aetna.com/aimmanageaccount/login?identityTransaction=getzphCU0eHDYva%2FgD8kUvyDvAwzFXd%2BG3uZK1cJMwQZ6yiFetiv3feZBm3rWfIu%2F2rymlZICkWANNk5Qie6FkCuLf%2Fb9W68QkVOa9EP0Lfyv%2BUHsRt6TqAMyXi3udmsgcsPDYldZj1jrkMG%2BEE84krieenUDUP0LypCPQEkHKNk28aIDsxY88wSVzaXURxsKNnS1t1HvRU7qTuK8kCObkrQpnwNRINoFhx7qlaMNkAVCpu%2BUqmr1NmxNR17QakmBVs4%2FEh2N9sSzQVY3TT%2BJL5vUygt31X8YFTQTcKml2HNLR9x51Yli698%2B1WKaZLtGYsqLKQtuCZ5iaR3hSpjbmF8fnfL1PqBg7Wncvg9KQF44PFZcE%2FoGNf%2BXjChEtpK04m%2BQT5yDWSipZTPRANEHxVTtDoghVW%2B54TGzbTpCoS6%2BGaJNt9H8ndQCCWdXBdGb4YjN3EYkmWyogwJsIeQ4l1epunclAOsSmZzWd6PplYP53m0K1MK432SWnr52MVo4BOfBaX7IJAT06NIfcHPtht7e3h1XPPp%2Bk8ry4%2Brx2RZ6%2FsX9xs7b2y02NUiKklBap%2B1Romb0o6BSMATm7axqT1GuIgYONd9Nb2SDQN04kUFKvwiG%2BeNYyQRAWw4D7BqP2VfwStk5mc2xQCNUyJVKA%3D%3D&appname=SSIBroker&branding=aetna&skin=&language=&channel=web&psuid=&biometric_text=&businessdata=channel~aetna|subchannel~broker&business_event=Login" }, // 16
  { label: "AFLAC", href: "https://producerportal.aflac.com/" }, // 17
  { label: "Americo", href: "https://account.americoagent.com/Identity/Account/Login/?" }, // 18
  { label: "American Amicable", href: "https://www.insuranceapplication.com/AppPage/index.html" }, // 19
  { label: "Foresters", href: "https://ezbiz.foresters.com/" }, // 20
  { label: "Mutual of Omaha", href: "https://accounts.mutualofomaha.com/" }, // 21
  { label: "Prosperity", href: "https://insuranceadmin.com/agent/login.php" }, // 22
  { label: "Transamerica", href: "https://ani.transamerica.com/" }, // 23
  { label: "Ethos", href: "https://agents.ethoslife.com/dashboard" }, // 24
];

function LinkButton({ label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-full text-xs sm:text-sm font-medium rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:border-emerald-400/70 hover:bg-emerald-400/10 transition"
    >
      {label}
    </a>
  );
}

export default function QuoteTool() {
  return (
    <div className="min-h-screen text-white">
      {/* Shared hamburger / hub header */}
      <HubHamburger />

      <main className="px-4 pb-24">
        <section className="max-w-5xl mx-auto pt-8">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80 mb-2">
            MOMENTUM MANAGER
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            Quote &amp; E-App Tool
          </h1>
          <p className="text-sm sm:text-base text-white/70 mb-8 max-w-2xl">
            One place for your carrier quoters, cheat sheets, and e-app portals.
            Use this page while you&apos;re in the sit so you aren&apos;t digging
            through bookmarks.
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Carrier Quote */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col">
              <div className="mb-3">
                <h2 className="text-sm font-semibold mb-1">
                  Carrier Quote
                </h2>
                <p className="text-xs text-white/60">
                  Quick links to carrier quote tools so you can ballpark coverage on the fly.
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {carrierQuoteLinks.map((item) => (
                  <LinkButton key={item.label} {...item} />
                ))}
              </div>
            </div>

            {/* Cheat Sheets */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col">
              <div className="mb-3">
                <h2 className="text-sm font-semibold mb-1">
                  Cheat Sheets
                </h2>
                <p className="text-xs text-white/60">
                  High-level cheat sheets you can glance at mid-call to keep the
                  product story tight.
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {cheatSheetLinks.map((item) => (
                  <LinkButton key={item.label} {...item} />
                ))}
              </div>
            </div>

            {/* E-Apps */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col">
              <div className="mb-3">
                <h2 className="text-sm font-semibold mb-1">
                  E-Apps
                </h2>
                <p className="text-xs text-white/60">
                  Jump straight into the carrier e-app portals once the client is locked in.
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {eAppLinks.map((item) => (
                  <LinkButton key={item.label} {...item} />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-8 text-[11px] text-white/40">
            For agents only. Bookmark this page and keep it open in a tab when
            you&apos;re running appointments.
          </p>
        </section>
      </main>
    </div>
  );
}
