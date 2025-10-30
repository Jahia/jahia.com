import { useId, useState } from "react";

const files = {
  "definition.cnd": {
    desc: "Describe the structure of your data and Jahia takes care of storing and generating interfaces for you.",
    code: `[example:codeSnippet] > jnt:content
 - language (string, choicelist) mandatory < 'html', 'css', 'js'
 - code (string, textarea) mandatory
 - lineNumbers (boolean) autocreated`,
  },
  "default.server.tsx": {
    desc: "Default server configuration",
    code: `import { Island, jahiaComponent } from "@jahia/javascript-modules-library";`,
  },
  "Code.client.tsx": {
    desc: "Client-side code for the Code module",
    code: `import { useState } from "react";`,
  },
  "styles.module.css": { desc: "Styles for the Code module", code: `.codeContainer {}` },
  "vite.config.js": {
    desc: "Vite configuration for the Code module",
    code: `import jahia from "@jahia/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		jahia(),
		// Add tailwind, svg processing, ...
	],
});
`,
  },
} satisfies Record<string, { desc: string; code: string }>;

export default function Code() {
  const [file, setFile] = useState<keyof typeof files>("definition.cnd");
  const name = useId();

  return (
    <div className="_row-4">
      <div className="_stack-2">
        {Object.keys(files).map((key) => (
          <label key={key}>
            <input
              type="radio"
              checked={file === key}
              name={name}
              onClick={() => setFile(key as keyof typeof files)}
            />
            {key}
          </label>
        ))}
      </div>
      <div className="_stack-2">
        <p>{files[file].desc}</p>
        <pre>
          <code>{files[file].code}</code>
        </pre>
      </div>
    </div>
  );
}
