export async function fn(path, payload) {
  const session = JSON.parse(localStorage.getItem("sb-session") || "{}");
  const userId = session?.user?.id;
  const res = await fetch(`/.netlify/functions/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId || "" },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
