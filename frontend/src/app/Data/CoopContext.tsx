"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type CoopContextType = {
  selectedCoopId: string | null;
  setSelectedCoopId: (id: string | null) => void;
};

const CoopContext = createContext<CoopContextType | undefined>(undefined);

export function CoopProvider({ children }: { children: ReactNode }) {
  const [selectedCoopId, setSelectedCoopId] = useState<string | null>(null);

  return (
    <CoopContext.Provider value={{ selectedCoopId, setSelectedCoopId }}>
      {children}
    </CoopContext.Provider>
  );
}

export function useCoop() {
  const context = useContext(CoopContext);
  if (!context) {
    throw new Error("useCoop must be used within a CoopProvider");
  }
  return context;
}