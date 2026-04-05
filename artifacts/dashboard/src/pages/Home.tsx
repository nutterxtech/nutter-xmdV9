import { useEffect } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/api";

export default function Home() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(getToken() ? "/dashboard" : "/");
  }, []);
  return null;
}
