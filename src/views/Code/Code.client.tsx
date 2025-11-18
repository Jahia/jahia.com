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
 - language (string, choicelist) mandatory < 'js', 'html', 'css'
 - code (string, textarea) mandatory`}</code>
        </pre>
      </>
    ),
  },
  {
    name: "default.server.tsx",
    icon: <span className="i-ri:reactjs-line" />,
    contents: (
      <>
        <p>Server rendered view of the component</p>
        <pre>
          <code>{`import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Copy from "./Copy.client.jsx";

jahiaComponent(
  { componentType: "view", nodeType: "training:codeSnippet" },
  ({ code, language }) => (
    <div>
      <Island component={Copy} props={{ code }} />
      <pre>{code}</pre>
    </div>
  ),
);`}</code>
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
          <code>{`import { useState } from "react"
import classes from "./styles.module.css"

export default function Copy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  return <button
    className={classes.copy}
    onClick={() => {
      navigator.clipboard.writeText(code)
      setCopied(true)
    }}
  >
    {copied ? "Copied!" : "Copy"}
  </button>
}
`}</code>
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
          <code>{`.wrapper {
  position: relative;
}

.copy {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}`}</code>
        </pre>
      </>
    ),
  },
  {
    name: "vite.config.ts",
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
