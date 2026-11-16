# bdpamkeattendance

## Next.js + SQLite

Backend persistence now uses SQLite (`server/data/bdpamke.sqlite` by default).

From [`bdpamkeclass/`](./bdpamkeclass/):

```bash
nvm use 22
npm install
npm run dev
npm run server
```

Node runtime is pinned to **Node 22 LTS** in [`bdpamkeclass/.nvmrc`](./bdpamkeclass/.nvmrc) and [`bdpamkeclass/package.json`](./bdpamkeclass/package.json).
Using Node 24 can require local native build tooling for `better-sqlite3` on Windows.

Production build:

```bash
npm run build
npm run start
npm run server
```

Optional environment variables:

- `SQLITE_FILE` — custom SQLite file path