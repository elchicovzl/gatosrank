"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getDictionary, type Dictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

interface CopyContextValue {
  copy: Dictionary;
  locale: Locale;
}

const CopyContext = createContext<CopyContextValue>({
  copy: getDictionary(DEFAULT_LOCALE),
  locale: DEFAULT_LOCALE,
});

interface CopyProviderProps {
  locale: Locale;
  children: ReactNode;
}

/**
 * Diccionario para los componentes de cliente.
 *
 * Recibe el CÓDIGO de idioma, no el diccionario: el objeto tiene funciones
 * y las funciones no se serializan del servidor al cliente. El navegador
 * elige el diccionario acá.
 *
 * Los componentes de servidor no usan esto — reciben `lang` por props y
 * llaman a `getDictionary()` directo.
 */
export function CopyProvider({ locale, children }: CopyProviderProps) {
  return (
    <CopyContext.Provider value={{ copy: getDictionary(locale), locale }}>
      {children}
    </CopyContext.Provider>
  );
}

export function useCopy(): Dictionary {
  return useContext(CopyContext).copy;
}

export function useLocale(): Locale {
  return useContext(CopyContext).locale;
}
