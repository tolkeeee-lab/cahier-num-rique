import { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/web';
import { supabaseClient } from '../supabaseClient';

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
      throw new Error('User not authenticated');
    }

    // PowerSync requires a specific JWT configuration for authorization.
    // We pass the Supabase access token directly.
    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL || '',
      token: session.access_token,
      expiresAt: new Date(session.expires_at ? session.expires_at * 1000 : Date.now() + 60 * 60 * 1000)
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const { op: opType, table, opData, id } = op;

        const tableRef = supabaseClient.from(table);
        let res;

        if (opType === 'PUT') {
          // Flatten data and add the ID
          const record = { ...opData, id };
          res = await tableRef.upsert(record);
        } else if (opType === 'PATCH') {
          res = await tableRef.update(opData || {}).eq('id', id);
        } else if (opType === 'DELETE') {
          res = await tableRef.delete().eq('id', id);
        }

        if (res && res.error) {
          throw new Error(`Supabase upload error for ${opType} on ${table}: ${res.error.message}`);
        }
      }

      await transaction.complete();
    } catch (ex) {
      console.error('Data upload error', ex, lastOp);
      throw ex;
    }
  }
}
