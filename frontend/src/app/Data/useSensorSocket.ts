"use client";

import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

export type SensorUpdate = {
  sensorId: string;
  coopId: string;
  type: string;
  value: number;
  isNormal: boolean;
  readAt: string;
};

export function useSensorSocket() {
  const [lastUpdate, setLastUpdate] = useState<SensorUpdate | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    let cancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7069/sensorHub")
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveSensorUpdate", (data: SensorUpdate) => {
      setLastUpdate(data);
    });

    connectionRef.current = connection;

    connection
      .start()
      .then(() => {
        // Strict Mode'da unmount erken olmuşsa bağlantıyı hemen kapat
        if (cancelled && connection.state === signalR.HubConnectionState.Connected) {
          connection.stop();
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("SignalR bağlantı hatası:", err);
        }
      });

    return () => {
      cancelled = true;
      // start() henüz tamamlanmamış olabilir — state'e göre karar ver
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      } else if (connection.state === signalR.HubConnectionState.Connecting) {
        // start() resolve olduğunda stop() çağrılacak (yukarıdaki then bloğu)
      }
    };
  }, []);

  return lastUpdate;
}
