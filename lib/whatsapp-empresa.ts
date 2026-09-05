"use client";

import { useEffect, useState } from "react";
import {
  EMPRESA_WHATSAPP_DEFAULT,
  esEmpresaWhatsApp,
  type EmpresaWhatsApp,
} from "@/lib/whatsapp";

const STORAGE_KEY = "whatsapp_empresa";
const EVENTO = "whatsapp-empresa";

export function leerEmpresaWhatsApp(): EmpresaWhatsApp {
  if (typeof window === "undefined") return EMPRESA_WHATSAPP_DEFAULT;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return esEmpresaWhatsApp(saved) ? saved : EMPRESA_WHATSAPP_DEFAULT;
}

export function guardarEmpresaWhatsApp(empresa: EmpresaWhatsApp): void {
  window.localStorage.setItem(STORAGE_KEY, empresa);
  window.dispatchEvent(new Event(EVENTO));
}

export function useEmpresaWhatsApp() {
  const [empresa, setEmpresa] = useState<EmpresaWhatsApp>(EMPRESA_WHATSAPP_DEFAULT);

  useEffect(() => {
    function sync() {
      setEmpresa(leerEmpresaWhatsApp());
    }
    sync();
    window.addEventListener(EVENTO, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENTO, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function elegir(next: EmpresaWhatsApp) {
    setEmpresa(next);
    guardarEmpresaWhatsApp(next);
  }

  return { empresa, elegir };
}
