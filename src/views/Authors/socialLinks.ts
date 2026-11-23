/** This policy also runs in GraalVM, without the browser's URL global. */
export function socialUrl(value: string, service: "linkedin" | "reddit" | "github") {
  const url = value.trim();
  if (
    [...url].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\")
  )
    return "";
  const authority = url.match(/^https:\/\/([^/?#]+)(?:[/?#]|$)/i)?.[1].toLowerCase();
  return authority === `${service}.com` || authority === `www.${service}.com` ? url : "";
}

/** A plain professional address only: no mail headers, recipient lists or URL parameters. */
export function professionalEmailLink(value: string) {
  const email = value.trim();
  const local = email.split("@")[0];
  if (
    email.length > 254 ||
    !/^[a-z0-9._+-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
      email,
    ) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  )
    return "";
  return "mailto:" + email;
}
