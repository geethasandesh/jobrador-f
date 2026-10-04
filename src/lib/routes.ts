const APP_ROOTS = ["/map", "/jobs", "/leads", "/businesses", "/report", "/route", "/referrals", "/admin", "/dashboard"];

export function isAppPath(path: string) {
  const pathname = path.split("?")[0] || "/";
  return APP_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function appDestination(next: string | null, showGuide: boolean) {
  const requested = next && next.startsWith("/") && !next.startsWith("//") && isAppPath(next) ? next : "/map";
  const [pathname, query = ""] = requested.split("?");
  const params = new URLSearchParams(query);
  if (showGuide) params.set("guide", "1");
  else params.delete("guide");
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
