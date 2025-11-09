interface PendingAction {
  id: string;
  type: 'complete_point' | 'send_report';
  data: any;
  timestamp: number;
}

const STORAGE_KEYS = {
  ROUTE_DATA: 'promoter_route_data',
  PENDING_ACTIONS: 'promoter_pending_actions',
  LAST_SYNC: 'promoter_last_sync',
};

export const offlineStorage = {
  saveRouteData(data: any) {
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTE_DATA, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save route data', e);
    }
  },

  getRouteData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROUTE_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to get route data', e);
      return null;
    }
  },

  addPendingAction(type: PendingAction['type'], data: any) {
    try {
      const pending = this.getPendingActions();
      const action: PendingAction = {
        id: `${Date.now()}_${Math.random()}`,
        type,
        data,
        timestamp: Date.now(),
      };
      pending.push(action);
      localStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pending));
      return action;
    } catch (e) {
      console.error('Failed to add pending action', e);
      return null;
    }
  },

  getPendingActions(): PendingAction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get pending actions', e);
      return [];
    }
  },

  removePendingAction(id: string) {
    try {
      const pending = this.getPendingActions();
      const filtered = pending.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to remove pending action', e);
    }
  },

  clearPendingActions() {
    try {
      localStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify([]));
    } catch (e) {
      console.error('Failed to clear pending actions', e);
    }
  },

  setLastSync(timestamp: number) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (e) {
      console.error('Failed to set last sync', e);
    }
  },

  getLastSync(): number {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data) : 0;
    } catch (e) {
      console.error('Failed to get last sync', e);
      return 0;
    }
  },

  hasPendingChanges(): boolean {
    return this.getPendingActions().length > 0;
  },
};

export const isOnline = () => navigator.onLine;

export const syncPendingActions = async (
  apiRoutes: string,
  apiReports: string,
  onProgress?: (current: number, total: number) => void
) => {
  const pending = offlineStorage.getPendingActions();
  
  if (pending.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const action = pending[i];
    
    try {
      if (action.type === 'complete_point') {
        await fetch(apiRoutes, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data),
        });
      } else if (action.type === 'send_report') {
        await fetch(apiReports, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data),
        });
      }
      
      offlineStorage.removePendingAction(action.id);
      synced++;
    } catch (error) {
      failed++;
    }
    
    if (onProgress) {
      onProgress(i + 1, pending.length);
    }
  }

  offlineStorage.setLastSync(Date.now());

  return { success: failed === 0, synced, failed };
};
