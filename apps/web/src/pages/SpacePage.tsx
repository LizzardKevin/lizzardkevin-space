import StartLobby from "../lobby/StartLobby";

export function SpacePage({
  disposing,
  onTrustedEnter,
  onDisposed,
}: {
  disposing: boolean;
  onTrustedEnter: () => void;
  onDisposed: () => void;
}) {
  return (
    <StartLobby
      disposing={disposing}
      onTrustedEnter={onTrustedEnter}
      onDisposed={onDisposed}
    />
  );
}

export default SpacePage;
