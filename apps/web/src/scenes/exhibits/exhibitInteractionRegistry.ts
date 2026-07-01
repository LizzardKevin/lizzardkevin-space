import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type RefObject,
} from "react";
import * as THREE from "three";

export type ExhibitInteractionRegistry = {
  registerTarget: (target: THREE.Object3D) => () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => THREE.Object3D[];
};

export function createExhibitInteractionRegistry(): ExhibitInteractionRegistry {
  const targets = new Set<THREE.Object3D>();
  const listeners = new Set<() => void>();
  let snapshot: THREE.Object3D[] = [];

  const emit = () => {
    snapshot = Array.from(targets);
    listeners.forEach((listener) => listener());
  };

  return {
    registerTarget(target) {
      targets.add(target);
      emit();
      return () => {
        if (!targets.delete(target)) return;
        emit();
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
  };
}

export const ExhibitInteractionRegistryContext =
  createContext<ExhibitInteractionRegistry | null>(null);

function useExhibitInteractionRegistry() {
  const registry = useContext(ExhibitInteractionRegistryContext);
  if (!registry) {
    throw new Error("Exhibit interaction registry is missing");
  }
  return registry;
}

export function useExhibitInteractionTargets() {
  const registry = useExhibitInteractionRegistry();
  return useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot);
}

export function useRegisterExhibitInteractionTarget(
  target: THREE.Object3D | null | undefined,
  enabled = true,
) {
  const registry = useExhibitInteractionRegistry();

  useEffect(() => {
    if (!enabled || !target) return;
    return registry.registerTarget(target);
  }, [enabled, registry, target]);
}

export function useRegisterExhibitInteractionRef<T extends THREE.Object3D>(
  targetRef: RefObject<T | null>,
  enabled = true,
) {
  const registry = useExhibitInteractionRegistry();

  useEffect(() => {
    if (!enabled || !targetRef.current) return;
    return registry.registerTarget(targetRef.current);
  }, [enabled, registry, targetRef]);
}
