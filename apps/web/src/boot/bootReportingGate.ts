type BootReportingScope = Readonly<{
  attemptId: number;
  phase: string;
}>;

export function isBootReportingEnabled(scope: BootReportingScope, attemptId: number) {
  return scope.attemptId === attemptId && scope.phase === "booting";
}

export function createBootReportingGate(getScope: () => BootReportingScope) {
  const isEnabled = (attemptId: number) => {
    const scope = getScope();
    return isBootReportingEnabled(scope, attemptId);
  };

  const wrap = <Args extends unknown[]>(attemptId: number, report: (...args: Args) => void) =>
    (...args: Args) => {
      if (isEnabled(attemptId)) report(...args);
    };

  return { isEnabled, wrap };
}
