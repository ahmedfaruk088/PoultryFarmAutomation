"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IdCard, Lock, Eye, EyeOff, Activity, Bell, FileBarChart } from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (username.trim() === "" || password.trim() === "") {
      setError("Personel ID ve şifre gerekli.");
      return;
    }

    try {
      // Backend'in /login endpoint'ini kullan — şifre BCrypt ile doğrulanır
      const res = await fetch("https://localhost:7069/api/User/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: username.trim(), password: password }),
      });

      if (res.status === 401) {
        setError("Personel ID veya şifre hatalı.");
        return;
      }
      if (!res.ok) throw new Error("Sunucu hatası");

      const foundUser = await res.json();

      localStorage.setItem("mockRole", (foundUser.role ?? "viewer").toLowerCase());
      localStorage.setItem("mockUserId", foundUser.userId);
      localStorage.setItem("mockUsername", `${foundUser.firstName} ${foundUser.lastName}`);

      router.push("/");
    } catch (err) {
      console.error("Giriş yapılırken hata oluştu:", err);
      setError("Sunucuya bağlanılamadı, lütfen backend'in çalıştığından emin olun.");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.introContent}>
        <div className={styles.logoRow}>
          <Image src="/logo.png" alt="Kümes Otomasyonu" width={44} height={44} />
          <span style={{ fontSize: 28, fontWeight: 800 }}>Kümes Otomasyonu</span>
        </div>

        <h1 className={styles.introTitle}>
          Endüstriyel IoT Alarmlı Kümes Otomasyonu
        </h1>
        <p className={styles.introSubtitle}>
          Sahadaki tüm sensörleri tek panelden izleyin, alarmları anında görün,
          geçmiş verileri raporlayın.
        </p>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}><Activity size={16} /></div>
          <span>Gerçek zamanlı sensör izleme</span>
        </div>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}><Bell size={16} /></div>
          <span>Anlık alarm bildirimleri</span>
        </div>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}><FileBarChart size={16} /></div>
          <span>Merkezi raporlama ve geçmiş analiz</span>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.formTitle}>Hoş Geldiniz</h2>
        <p className={styles.formSubtitle}>Devam etmek için personel ID'niz ile giriş yapın</p>

        <form onSubmit={handleSubmit}>
          <label className={styles.fieldLabel}>Personel ID</label>
          <div className={styles.inputBox}>
            <IdCard size={17} color="#9ca3af" />
            <input
              type="text"
              placeholder="örn: OPR001 veya ADM001"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <label className={styles.fieldLabel}>Şifre</label>
          <div className={styles.inputBox}>
            <Lock size={17} color="#9ca3af" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <button type="submit" className={styles.submitButton}>
            Sisteme Giriş Yap
          </button>
        </form>

      </div>
    </div>
  );
}