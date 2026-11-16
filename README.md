# bdpamkeattendance

## SQLite migration

Backend persistence now uses SQLite (`server/data/bdpamke.sqlite` by default).

From [`bdpamkeclass/`](/workspaces/bdpamkeattendance/bdpamkeclass):

```bash
npm install
npm run migrate:mongo-to-sqlite   # optional: copy existing MongoDB data into SQLite
npm run server
```

Optional environment variables:

- `SQLITE_FILE` — custom SQLite file path
- `MONGO_URI` — MongoDB URI used by the migration script