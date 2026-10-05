'use client';

import React, { ReactNode, useMemo } from 'react';
import { PowerSyncDatabase } from '@powersync/web';
import { PowerSyncContext } from '@powersync/react';
import { AppSchema } from './AppSchema';
import { SupabaseConnector } from './Connector';

export const db = new PowerSyncDatabase({
  database: {
    dbFilename: 'cahier_numerique_v2.sqlite'
  },
  schema: AppSchema
});

export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
  const connector = useMemo(() => new SupabaseConnector(), []);

  React.useEffect(() => {
    // Initiate the PowerSync database and connection on mount
    db.init().then(() => {
      // Avoid attempting to connect if the endpoint is missing during dev setup
      if (process.env.NEXT_PUBLIC_POWERSYNC_URL) {
        db.connect(connector);
      }
    });

    return () => {
      db.disconnect();
    };
  }, [connector]);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
};
