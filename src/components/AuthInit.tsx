'use client';

import { useEffect } from "react";
import { initAuth } from "@/lib/auth";

export default function AuthInit() {
  useEffect(() => {
    initAuth();
  }, []);

  return null;
}
