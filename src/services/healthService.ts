// src/services/healthService.ts
export type HealthStatus = {
  ok: boolean;
  uptime: number;    // seconds
  timestamp: string; // ISO
};

export async function getHealth(): Promise<HealthStatus> {
  return {
    ok: true,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
