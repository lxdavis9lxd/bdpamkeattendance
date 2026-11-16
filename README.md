# bdpamkeattendance

## SQLite migration

Backend persistence now uses SQLite (`server/data/bdpamke.sqlite` by default).

From [`bdpamkeclass/`](./bdpamkeclass/):

```bash
npm install
npm run server
```

Optional environment variables:

- `SQLITE_FILE` — custom SQLite file path