import { CTA } from "../../mixins/CTA/index.jsx";
import { MixinCTA, type CTAProps } from "../../mixins/CTA/server.jsx";
import { navigationUrl } from "../../templates/navigationUrl.js";

export type AdditionalButtonProps = {
  additionalButtonLabel?: string;
  additionalButtonDestination?: string;
  additionalButtonVariant?: "primary" | "secondary";
};

export default function Buttons({
  cta,
  name,
  location = "hero_banner",
}: {
  cta: CTAProps & AdditionalButtonProps;
  name: string;
  location?: "hero_banner" | "inlay_banner";
}) {
  const destination = navigationUrl(cta.additionalButtonDestination);
  const hasAdditionalButton = !!cta.additionalButtonLabel?.trim() && !!destination;
  if (cta.ctaType === "none" && !hasAdditionalButton) return null;
  return (
    <p className="_pack-4" style={{ flexWrap: "wrap" }}>
      {cta.ctaType !== "none" && <MixinCTA cta={cta} location={location} name={name} />}
      {hasAdditionalButton && (
        <CTA
          href={destination}
          secondary={cta.additionalButtonVariant !== "primary"}
          location={location}
          name={`${name}_additional`}
          icon
        >
          {cta.additionalButtonLabel}
        </CTA>
      )}
    </p>
  );
}
