import { useEffect } from "react";

export default function ProfileUrl() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("region")) return;
    url.searchParams.delete("region");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  return null;
}
