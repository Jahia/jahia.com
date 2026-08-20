# Jahia.com is Open Source!

This repository contains the [JavaScript Module](https://academy.jahia.com/tutorials-get-started/front-end-developer/introduction) that powers [**Jahia.com**](https://www.jahia.com). It defines the page templates, content types, views, and UI components used to build and render the public Jahia website.

This module is source-available but not open source. It is licensed under the [Jahia Sustainable Enterprise License (JSEL)](./LICENSE) and cannot be used outside of the official Jahia.com website. However, it is available for learning and reference purposes. We encourage you to explore the code, understand how it works, and use it as inspiration for your own projects.

## Getting Started

To build and run this module locally you will need a working development environment with Node.js, Yarn and Docker installed and configured. Please refer to the [Getting Started](https://github.com/Jahia/javascript-modules/tree/main/docs/1-getting-started/1-dev-environment#pre-requisites) guide if you need help setting up your environment.

Once your environment is ready, use the following commands to start a local Jahia instance and run the module in development mode:

```bash
# Install dependencies
yarn install

# Start Jahia in Docker
docker compose up --wait

# Build the module and start the dev mode
yarn dev
```

### Local Docker environment

The Compose stack starts Jahia 8.2 and PostgreSQL 16, then installs the modules listed in
[`docker/provisioning.yml`](./docker/provisioning.yml). The first startup can take several minutes while Jahia initializes its repository and downloads the provisioned modules.

Requirements:

- Docker Desktop (or Docker Engine with Compose v2) must be installed and running;
- ports `8080`, `9229`, and `5432` must be available by default;
- allocate at least 4 GB of memory to Docker for a comfortable local startup.

Validate and start the environment:

```bash
docker compose config --quiet
docker compose up --wait
docker compose ps
```

Jahia is then available at <http://localhost:8080> with the local development credentials `root` / `root1234`. Follow startup or provisioning failures with:

```bash
docker compose logs -f jahia
```

Jahia and PostgreSQL data are stored in named Docker volumes, so `docker compose down` preserves the local repository. To deliberately recreate a clean environment, remove those volumes before starting again:

```bash
docker compose down --volumes
docker compose up --wait
```

Ports, passwords, or the Jahia image can be overridden for a single command without editing tracked files. For example:

```bash
JAHIA_PORT=8180 POSTGRES_PORT=5433 docker compose up --wait
```

Supported variables are `JAHIA_IMAGE`, `JAHIA_PORT`, `JAHIA_DEBUG_PORT`, `POSTGRES_PORT`, `JAHIA_DB_PASSWORD`, and `JAHIA_SUPER_USER_PASSWORD`. Do not store licenses, deployment authorization, or other production/preproduction secrets in the tracked `.env` file.

Contributions to this repository are not explicitely forbidden, but are very unlikely to be accepted.

## Content Types

The module defines custom content types under the `jahiacom` and `jahiacommix` namespaces. You will find common patterns:

- A blog with authors
- A sectioning component
- Automated OpenGraph metadata generation
- A generated navigation menu based on the content tree

You are free to use these content types as inspiration for your own projects.
