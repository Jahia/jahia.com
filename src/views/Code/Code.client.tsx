import { useId, useState } from "react";
import classes from "./styles.module.css";

const files = {
  "definition.cnd": (
    <>
      <p>
        Describe the structure of your data and Jahia takes care of storing and generating
        interfaces for you.
      </p>
      <pre>
        <code>{`[example:codeSnippet] > jnt:content
 - language (string, choicelist) mandatory < 'html', 'css', 'js'
 - code (string, textarea) mandatory
 - lineNumbers (boolean) autocreated`}</code>
      </pre>
    </>
  ),
  "default.server.tsx": (
    <>
      <p>Default server configuration</p>
      <pre>
        <code>{`import { Island, jahiaComponent } from "@jahia/javascript-modules-library";`}</code>
      </pre>
    </>
  ),
  "Code.client.tsx": (
    <>
      <p>Client-side code for the Code module</p>
      <pre>
        <code>{`import { useState } from "react";`}</code>
      </pre>
    </>
  ),
  "styles.module.css": (
    <>
      <p>Styles for the Code module</p>
      <pre>
        <code>{`.codeContainer {}`}</code>
      </pre>
    </>
  ),
  "vite.config.js": (
    <>
      <p>Vite configuration for the Code module</p>
      <pre>
        <code>{`import jahia from "@jahia/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		jahia(),
		// Add tailwind, svg processing, ...
	],
});`}</code>
      </pre>
    </>
  ),
};

export default function Code() {
  const [file, setFile] = useState<keyof typeof files>("definition.cnd");
  const name = useId();

  return (
    <div className={classes.container}>
      <div className={classes.grid}>
        <div className={classes.tabs}>
          {Object.keys(files).map((key) => (
            <label key={key}>
              <input
                type="radio"
                checked={file === key}
                name={name}
                onClick={() => setFile(key as keyof typeof files)}
              />
              <span className="i-simple-icons:vite" />
              {key}
            </label>
          ))}
        </div>
        <div className={classes.panel}>{files[file]}</div>
      </div>
    </div>
  );
}
