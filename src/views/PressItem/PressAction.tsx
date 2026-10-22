import { CTA } from "../../mixins/CTA/index.jsx";
import { navigationUrl } from "../../templates/navigationUrl.js";

/** Render an action only when an usable destination is configured. */
export default function PressAction({
  href,
  label,
  name,
  secondary = true,
  download,
}: {
  href?: string;
  label: string;
  name: string;
  secondary?: boolean;
  download?: boolean;
}) {
  const safeHref = navigationUrl(href);
  return safeHref ? (
    <CTA
      href={safeHref}
      secondary={secondary}
      location="press_room"
      name={name}
      download={download}
    >
      {label}
    </CTA>
  ) : null;
}
