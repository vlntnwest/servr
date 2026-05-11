import { io, Socket } from "socket.io-client";
import { createClient } from "@/lib/supabase/client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? "";
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

/**
 * Returns a connected, authenticated socket — or null if no Supabase session.
 * The API rejects unauthenticated socket connections (`socket.handshake.auth.token`).
 */
export async function connectSocket(): Promise<Socket | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const s = getSocket();
  s.auth = { token: session.access_token };
  if (!s.connected) s.connect();
  return s;
}
