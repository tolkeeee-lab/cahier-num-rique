# V2 Offline Architecture (PowerSync)

This branch (`v2/offline-engine`) contains the in-progress rewrite of the offline data synchronization layer. It replaces the custom, error-prone `offlineDb.ts` + Supabase Rest API merge strategy with `@powersync/web` (SQLite WASM).

## Prerequisites for Deployment

1. **PowerSync Cloud / Docker Instance:**
   You must provision a PowerSync instance connected to the underlying Supabase PostgreSQL database via logical replication.
2. **Sync Rules:**
   Apply the rules defined in `sync_rules.yaml` to the PowerSync instance to ensure data is partitioned correctly by `shop_id`.
3. **Environment Variables:**
   Set `NEXT_PUBLIC_POWERSYNC_URL` in your `.env` to point to the PowerSync instance.
4. **Supabase JWT:**
   The `Connector.ts` file assumes your Supabase JWTs contain the claims necessary to map to the `shop_id` parameter in the sync rules. If custom JWT claims are needed, update Supabase Auth settings to inject `shop_id` into the JWT.

## Status

- `useJournalData.ts` has been refactored to read and execute mutations via the local SQLite database.
- `useSaleCreation.ts` still needs to be refactored to execute `INSERT` statements against the `sales` and `sold_articles` SQLite tables instead of Supabase.
