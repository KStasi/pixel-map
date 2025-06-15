import { useEffect, useRef, useState, useCallback } from "react";
import type { PixelInfo, WebSocketMessages } from "../types";
import type { Pixel } from "../types/map";

// WebSocket hook for connecting to the game server
export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const webSocketRef = useRef<WebSocket | null>(null);
    const [lastMessage, setLastMessage] = useState<WebSocketMessages | null>(null);
    const [dbMap, setDbMap] = useState<Map<number, Pixel> | null>(null);

    // WebSocket server URL (use environment variable if available)
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

    // Initialize WebSocket connection
    useEffect(() => {
        const webSocket = new WebSocket(wsUrl);

        webSocket.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        webSocket.onclose = () => {
            setIsConnected(false);
        };

        webSocket.onerror = () => {
            setError("Failed to connect to game server");
            setIsConnected(false);
        };

        webSocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "map:state") {
                    console.log("map:state", message.payload);
                    const pixels = message.payload.map((p: any) => ({
                        id: Number(p.id),
                        color:
                            typeof p.color === "string" ? p.color : `#${Number(p.color).toString(16).padStart(6, "0")}`,
                        price: p.price ?? 0,
                    }));
                    setDbMap(new Map(pixels.map((p: any) => [p.id, p])));
                }

                setLastMessage(message as WebSocketMessages);
            } catch (err) {
                console.error("Error parsing WebSocket message", err);
            }
        };

        webSocketRef.current = webSocket;

        // Cleanup on unmount
        return () => {
            webSocket.close();
        };
    }, [wsUrl]);

    // Send a message to the server
    const sendMessage = useCallback(
        (message: object) => {
            if (webSocketRef.current && isConnected) {
                webSocketRef.current.send(JSON.stringify(message));
            } else {
                setError("Not connected to server");
            }
        },
        [isConnected]
    );

    // Send app session start game with signature
    const sendAppSessionBuyPixels = useCallback(
        (eoa: string, pixels: PixelInfo[], totalPrice: number, signature: string, requestToSign: unknown[]) => {
            sendMessage({
                type: "appSession:buyPixels",
                payload: { eoa, pixels, totalPrice, signature, requestToSign },
            });
        },
        [sendMessage]
    );
    // Send app session start game with signature
    const sendRequestMapState = useCallback(() => {
        sendMessage({
            type: "map:state",
        });
    }, [sendMessage]);

    return {
        isConnected,
        error,
        lastMessage,
        dbMap,
        sendRequestMapState,
        sendAppSessionBuyPixels,
    };
}
