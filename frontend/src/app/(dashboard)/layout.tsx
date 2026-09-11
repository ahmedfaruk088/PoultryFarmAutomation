"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import { CoopProvider } from "../Data/CoopContext";

// Sadece admin'e özel sayfalar — bu path'lere başka rol giremez
const ADMIN_ONLY_PATHS = ["/plc", "/assignments"];

// Giriş gerektiren ama rol kısıtı olmayan sayfalar herkese açık
// (SideBar zaten adminOnly menüleri gizliyor; layout URL koruması için ikinci savunma hattı)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("mockRole");

    // Giriş yoksa login'e yönlendir
    if (!role) {
      router.push("/login");
      return;
    }

    // Admin-only sayfalara admin olmayan girmeye çalışırsa ana sayfaya yönlendir
    if (role !== "admin" && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
      router.replace("/");
      return;
    }

    setChecked(true);
  }, [router, pathname]);

  if (!checked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        Yükleniyor...
      </div>
    );
  }

  return (
    <CoopProvider>
      <div style={{ display: "flex" }}>
        <SideBar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <TopBar />
          <main style={{ padding: 24, background: "#f9fafb", flex: 1 }}>{children}</main>
        </div>
      </div>
    </CoopProvider>
  );
}
