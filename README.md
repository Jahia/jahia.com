# Welcome!

Your JavaScript module was successfully created. If this is your first time creating a module, you may want to consult the [Getting Started guide](https://github.com/Jahia/javascript-modules/tree/main/docs/1-getting-started/1-dev-environment#create-a-new-project).

This README assumes you have a working development environment with Node.js, Yarn and Docker installed and configured. Please refer to the [Getting Started](https://github.com/Jahia/javascript-modules/tree/main/docs/1-getting-started/1-dev-environment#pre-requisites) guide if you need help setting up your environment.

## Scripts

This module comes with some scripts to help you develop your module. You can run them with `yarn <script>`:

| Category     | Script                | Description                                                             |
| ------------ | --------------------- | ----------------------------------------------------------------------- |
| Build        | `build`               | Produces a deployable artifact that can be uploaded to a Jahia instance |
| Build        | `deploy`              | Pushes the build artifact to a Jahia instance                           |
| Development  | `dev` (alias `watch`) | Watches for changes and rebuilds the module                             |
| Code quality | `format`              | Runs Prettier (a code formatter) on your code                           |
| Code quality | `lint`                | Runs ESLint (a linter) on your code                                     |
| Utils        | `clean`               | Removes build artifacts                                                 |
| Utils        | `package`             | Packs distributions files in a `.tgz` archive inside the `dist/` folder |
| Utils        | `watch:callback`      | Called every time a build succeeds in watch mode                        |

## Configuration

If you don't use default configuration for the Docker container name or for Jahia deployments, please modify the provided `.env` file
