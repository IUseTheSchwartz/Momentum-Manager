import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  try {
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    const issues = [];
    if (!VITE_SUPABASE_URL) issues.push("VITE_SUPABASE_URL missing");
    if (!SUPABASE_SERVICE_ROLE) issues.push("SUPABASE_SERVICE_ROLE missing");
    let payload = {};
    try { payload = JSON.parse(event.body || "{}"); } catch {}
    const { bucket, file_path } = payload;

    const supa = (VITE_SUPABASE_URL && SUPABASE_SERVICE_ROLE)
      ? createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE)
      : null;

    let downloadOk = false;
    let textLen = 0;

    if (supa && bucket && file_path) {
      const dl = await supa.storage.from(bucket).download(file_path);
      if (dl.error) {
        issues.push("download error: " + dl.error.message);
      } else {
        const t = await dl.data.text();
        textLen = t.length;
        downloadOk = true;
      }
    } else {
      if (!bucket) issues.push("bucket missing");
      if (!file_path) issues.push("file_path missing");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, downloadOk, textLen, issues }),
    };
  } catch (e) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: String(e) }) };
  }
};
