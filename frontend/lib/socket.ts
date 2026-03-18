import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? "";
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
}
