import { useEffect } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/api";

export default function Connect() {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (getToken()) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#080d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#64748b" }}>Redirecting...</div>
    </div>
  );
}
