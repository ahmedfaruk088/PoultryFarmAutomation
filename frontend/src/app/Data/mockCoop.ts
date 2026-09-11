export type Coop = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentCount: number;
  status: "active" | "passive";
};

export const mockCoops: Coop[] = [
  { id: "coop1", name: "Kümes 1", location: "Bursa Ana Tesis", capacity: 5000, currentCount: 4820, status: "active" },
  { id: "coop2", name: "Kümes 2", location: "Bursa Ana Tesis", capacity: 5000, currentCount: 4950, status: "active" },
  { id: "coop3", name: "Kümes 3", location: "Bursa Ana Tesis", capacity: 4000, currentCount: 3890, status: "active" },
];