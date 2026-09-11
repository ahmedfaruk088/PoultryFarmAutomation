export type Sensor = {
  sensorId: string;
  sensorName: string;
  type: string;
  unit: string;
  coopId: string;
  minThreshold: number;
  maxThreshold: number;
  value: number;
  isNormal: boolean;
  readAt: string;
  plcId?: string | null;
};

// Sensörden bu süreden daha uzun süredir veri gelmediyse "veri alınamıyor" say
const STALE_THRESHOLD_MS = 90 * 1000;

export function isSensorStale(sensor: Sensor): boolean {
  if (!sensor.readAt) return true;
  const lastReadTime = new Date(sensor.readAt).getTime();
  return Date.now() - lastReadTime > STALE_THRESHOLD_MS;
}

export function getStatus(sensor: Sensor): "normal" | "alarm" | "offline" {
  if (isSensorStale(sensor)) return "offline";
  return sensor.isNormal ? "normal" : "alarm";
}