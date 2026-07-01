import { useMemo, type ReactNode } from "react";
import {
  ExhibitInteractionRegistryContext,
  createExhibitInteractionRegistry,
} from "./exhibitInteractionRegistry";

export function ExhibitInteractionRegistryProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => createExhibitInteractionRegistry(), []);
  return (
    <ExhibitInteractionRegistryContext.Provider value={registry}>
      {children}
    </ExhibitInteractionRegistryContext.Provider>
  );
}
