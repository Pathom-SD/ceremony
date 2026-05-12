import type { Server as SocketIOServer } from "socket.io";

declare global {
  var __ceremony_io: SocketIOServer | undefined;
}

export function emitCeremony(event: string, payload?: unknown) {
  globalThis.__ceremony_io?.emit(event, payload);
}
