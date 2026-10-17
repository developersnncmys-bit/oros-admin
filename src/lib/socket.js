import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
            autoConnect: false,
            transports: ["websocket"]
        });
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
    }
};
