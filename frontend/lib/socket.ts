import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? "";
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  } else if (token) {
    socket.auth = { token };
  }
  return socket;
}
