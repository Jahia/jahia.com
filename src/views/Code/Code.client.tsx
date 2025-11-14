import { useId, useState, type ReactNode } from "react";
import classes from "./styles.module.css";

interface File {
  name: string;
  icon: ReactNode;
  contents: ReactNode;
}

const files: File[] = [
  {
    name: "definition.cnd",
    icon: <span className="i-custom:jackrabbit" />,
    contents: (
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
  },
  {
    name: "default.server.tsx",
    icon: <span className="i-ri:reactjs-line" />,
    contents: (
      <>
        <p>Default server configuration</p>
        <pre>
          <code>{`import { Island, jahiaComponent } from "@jahia/javascript-modules-library";

// ...`}</code>
        </pre>
      </>
    ),
  },
  {
    name: "Code.client.tsx",
    icon: <span className="i-ri:reactjs-line" />,
    contents: (
      <>
        <p>Client-side code for the Code module</p>
        <pre>
          <code>{`import { useState } from "react";`}</code>
        </pre>
      </>
    ),
  },
  {
    name: "styles.module.css",
    icon: <span className="i-simple-icons:css" />,
    contents: (
      <>
        <p>Styles for the Code module</p>
        <pre>
          <code>{`.codeContainer {}`}</code>
        </pre>
      </>
    ),
  },
  {
    name: "vite.config.js",
    icon: <span className="i-simple-icons:vite" />,
    contents: (
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
  },
];

export default function Code() {
  const [{ name, contents }, setFile] = useState<File>(files[0]);
  const id = useId();

  return (
    <div className={classes.container}>
      <div className={classes.grid}>
        <div className={classes.tabs}>
          {files.map((file) => (
            <label key={file.name}>
              <input
                type="radio"
                checked={file.name === name}
                name={id}
                onClick={() => setFile(file)}
              />
              {file.icon}
              {file.name}
            </label>
          ))}
        </div>
        <div className={classes.panel}>{contents}</div>
      </div>
    </div>
  );
}
