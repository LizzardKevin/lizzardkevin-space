type BootReportingScope = Readonly<{
  attemptId: number;
  phase: string;
}>;

export function isBootReportingEnabled(scope: BootReportingScope, attemptId: number) {
  return scope.attemptId === attemptId && scope.phase === "booting";
}
