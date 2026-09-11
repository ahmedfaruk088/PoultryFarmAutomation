export type UserAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: "Admin" | "Operator" | "Viewer";
  location: string;
};

export const mockUsers: UserAccount[] = [
  { id: "1000", firstName: "Ahmed Faruk", lastName: "Tüfek", email: "ahmetfrktfk2@...", phoneNumber: "5523644653", role: "Admin", location: "Bursa - Genel Merkez" },
];