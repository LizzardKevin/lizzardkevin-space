export type SpaceFocusSurfaceState<T> = {
  focusOverlayExhibit: T | null;
  invalidFocusedRoute: boolean;
  onboardingFocusVisible: boolean;
  focusSurfaceOpen: boolean;
};

export function resolveSpaceFocusSurfaceState<T>({
  entered,
  focused,
  focusClosing,
  focusedRoutePending,
  onboardingFocusOpen,
  onboardingFocusClosing,
}: {
  entered: boolean;
  focused: T | null;
  focusClosing: T | null;
  focusedRoutePending: boolean;
  onboardingFocusOpen: boolean;
  onboardingFocusClosing: boolean;
}): SpaceFocusSurfaceState<T> {
  if (!entered) {
    return {
      focusOverlayExhibit: null,
      invalidFocusedRoute: false,
      onboardingFocusVisible: false,
      focusSurfaceOpen: false,
    };
  }

  const focusOverlayExhibit = focused ?? focusClosing;
  const invalidFocusedRoute = focusedRoutePending;
  const onboardingFocusVisible = onboardingFocusOpen || onboardingFocusClosing;
  return {
    focusOverlayExhibit,
    invalidFocusedRoute,
    onboardingFocusVisible,
    focusSurfaceOpen:
      focusOverlayExhibit !== null || onboardingFocusVisible || invalidFocusedRoute,
  };
}
