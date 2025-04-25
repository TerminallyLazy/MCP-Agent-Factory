import { ReadableStream } from 'stream/web';
import { ChildProcess } from 'child_process';
import { Readable } from 'stream';

// Keep track of active processes
export type ProcessInfo = {
  process: ChildProcess;
  stream?: Readable | null;
  lastActivity: number;
};

// --- Use globalThis to persist activeProcesses across hot reloads in development ---
// Extend the global Node.js namespace to avoid TypeScript errors
declare global {
  var activeProcessesStore: Record<string, ProcessInfo> | undefined;
}

// Initialize or retrieve the store from globalThis
if (!globalThis.activeProcessesStore) {
  console.log('[ProcessManager] Initializing global process store.');
  globalThis.activeProcessesStore = {};
} else {
  console.log(`[ProcessManager] Reusing existing global process store (Count: ${Object.keys(globalThis.activeProcessesStore).length}).`);
}

// Export the store for use in API routes
export const activeProcesses: Record<string, ProcessInfo> = globalThis.activeProcessesStore;
// -------------------------------------------------------------------------------

// Cleanup old processes periodically
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupInterval() {
  if (cleanupInterval) return; // Prevent multiple intervals
  console.log('[ProcessManager] Starting cleanup interval.');
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    Object.entries(activeProcesses).forEach(([agentId, info]) => {
       // Ensure info and info.process still exist before accessing properties
      if (!info || !info.process) {
         console.warn(`[ProcessManager] Found invalid entry for ${agentId} during cleanup. Removing.`);
         delete activeProcesses[agentId];
         return;
      }

      // If process has been inactive for more than 5 minutes, kill it
      // Also check if the process hasn't already exited
      if (info.process.exitCode === null && now - info.lastActivity > 5 * 60 * 1000) {
        console.log(`[ProcessManager] Killing inactive process for agent ${agentId}`);
        try {
          info.process.kill();
        } catch (e) {
          console.error(`[ProcessManager] Error killing process for agent ${agentId}:`, e);
        }
        // Note: We don't delete immediately, let the 'close' event handle it (if listener exists)
        // or the next interval check based on exitCode.
      } else if (info.process.exitCode !== null) {
        // If process has exited, ensure it's removed from the map
        // This handles cases where the 'close' event might not have cleaned up
        console.log(`[ProcessManager] Cleaning up exited process for agent ${agentId}`);
        delete activeProcesses[agentId];
      }
    });
  }, 60 * 1000); // Check every minute
}

// --- Ensure the interval doesn't get duplicated on hot reloads ---
// Store interval ID on global to manage it across reloads
declare global {
    var processCleanupIntervalId: NodeJS.Timeout | undefined;
}

if (process.env.NODE_ENV === 'development') {
    if (globalThis.processCleanupIntervalId) {
        console.log('[ProcessManager] Clearing existing cleanup interval due to reload.');
        clearInterval(globalThis.processCleanupIntervalId);
        globalThis.processCleanupIntervalId = undefined;
        cleanupInterval = null; // Reset local variable too
    }
    startCleanupInterval();
    globalThis.processCleanupIntervalId = cleanupInterval ?? undefined;
} else {
    // In production, just start it once
    startCleanupInterval();
}
// ---------------------------------------------------------------

console.log('[ProcessManager] Module initialized.');

// Optional: Add helper functions if needed, e.g.:
// export function addProcess(agentId: string, processInfo: ProcessInfo) { ... }
// export function getProcess(agentId: string): ProcessInfo | undefined { ... }
// export function removeProcess(agentId: string) { ... } 