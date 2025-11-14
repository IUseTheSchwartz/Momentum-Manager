// File: src/lib/utm.js

// Tiny helper to read UTM params from the current URL
export function readUTM() {
  if (typeof window === "undefined") return null;

  const search = window.location.search;
  if (!search) return null;

  const params = new URLSearchParams(search);
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
  ];

  const out = {};
  let hasAny = false;

  for (const key of keys) {
    const value = params.get(key);
    if (value) {
      out[key] = value;
      hasAny = true;
    }
  }

  return hasAny ? out : null;
}
