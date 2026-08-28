import { io , type Socket } from "socket.io-client";

const BASE = ( import.meta.env.VITE_API_URL as string  | undefined)

let socket : Socket | null = null;
let refCount = 0

export const connectSocket = ( token : string) : Socket => {
    // Every caller of connectSocket() is expected to call releaseSocket() exactly once when done
    // (see useNotificationSocket's cleanup) — so the count must go up on every call that hands out
    // a reference, not only the call that happens to create the underlying socket. Incrementing
    // only inside the "create new" branch undercounts concurrent consumers of the shared socket
    // and lets the first one to unmount disconnect it out from under the others.
    refCount += 1;
    if (socket ) return socket;
    socket = io(BASE , { auth : { token }});
    return socket;
};

export const releaseSocket = () => {
    refCount = Math.max(0, refCount - 1);
    if(refCount === 0){
        socket?.disconnect();
        socket = null;
    }
}

export const disconnectSocket = () => {
    socket?.disconnect();
    socket = null;
}