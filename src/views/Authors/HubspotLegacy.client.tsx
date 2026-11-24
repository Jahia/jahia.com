import { useEffect, useId, useRef, useState } from "react";

interface FormOptions {
  portalId: string;
  formId: string;
  region: string;
}

interface Props extends FormOptions {
  scriptUrl: string;
  errorMessage: string;
}

type Forms = {
  create(options: FormOptions & { target: string; formInstanceId: string }): void;
};

const scripts = new Map<string, Promise<Forms>>();

function loadForms(url: string) {
  const existing = scripts.get(url);
  if (existing) return existing;
  const request = new Promise<Forms>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => {
      const forms = (window as Window & { hbspt?: { forms: Forms } }).hbspt?.forms;
      if (forms) resolve(forms);
      else reject(new Error("HubSpot Forms did not initialize"));
    };
    script.onerror = () => reject(new Error("HubSpot Forms could not load"));
    document.head.append(script);
  }).catch((error: unknown) => {
    scripts.delete(url);
    throw error;
  });
  scripts.set(url, request);
  return request;
}

export default function HubspotLegacy({
  portalId,
  formId,
  region,
  scriptUrl,
  errorMessage,
}: Props) {
  const id = useId();
  const target = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const container = target.current;
    if (!container) return;
    let active = true;
    void loadForms(scriptUrl)
      .then((forms) => {
        if (!active) return;
        forms.create({
          portalId,
          formId,
          region,
          target: "#" + CSS.escape(container.id),
          formInstanceId: container.id,
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [portalId, formId, region, scriptUrl]);

  return (
    <>
      <div id={id} ref={target} />
      {failed && <p role="status">{errorMessage}</p>}
    </>
  );
}
