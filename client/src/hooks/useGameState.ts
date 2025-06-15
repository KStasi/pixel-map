import { useState, useEffect, useCallback } from "react";
import type {
    WebSocketMessages,
    AppSessionSignatureRequestMessage,
    AppSessionBuyPixelsRequestMessage,
    PixelInfo,
} from "../types";
import { useAppSessionSignature } from "./useAppSessionSignature";

// Game state hook that processes WebSocket messages
export function useGameState(
    lastMessage: WebSocketMessages | null,
    eoaAddress: string,
    sendAppSessionSignature?: (roomId: string, signature: string) => void,
    sendAppSessionBuyPixels?: (eoa: string, pixels: PixelInfo[], totalPrice: number, signature: string) => void
) {
    // Game state
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [pendingSignatureRequest, setPendingSignatureRequest] = useState<
        AppSessionSignatureRequestMessage | AppSessionBuyPixelsRequestMessage | null
    >(null);

    // App session signature handling
    const { isSigningInProgress, signatureError, handleParticipantBSignature, handleParticipantASignature } =
        useAppSessionSignature(sendAppSessionSignature, sendAppSessionBuyPixels);

    // We don't need to generate room IDs client-side anymore
    // The server handles room creation

    // Process WebSocket messages to update game state
    useEffect(() => {
        if (!lastMessage) return;

        console.log("Received WebSocket message:", lastMessage.type, lastMessage);

        switch (lastMessage.type) {
            case "map:state":
                // update map state
                // setIsRoomReady(true);
                setErrorMessage(null);
                break;

            case "purchase:success":
                // update map state
                setErrorMessage(null);
                break;
            case "purchase:failed":
                // update map state
                setErrorMessage(null);
                break;

            case "appSession:buyPixelsRequest":
                console.log("Received buy pixels request:", lastMessage);
                setPendingSignatureRequest(lastMessage as AppSessionBuyPixelsRequestMessage);
                break;

            case "appSession:signatureConfirmed":
                console.log("App session signature confirmed:", lastMessage);
                setPendingSignatureRequest(null);
                setErrorMessage(null);
                break;

            case "error":
                setErrorMessage(lastMessage.msg);
                break;

            default:
                // Ignore unknown message types
                break;
        }
    }, [lastMessage, eoaAddress, handleParticipantBSignature]);

    // Helper to format short address display
    const formatShortAddress = (address: string): string => {
        if (!address) return "";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Handle host signing and starting game
    const signAndStartGame = useCallback(async () => {
        if (!pendingSignatureRequest || pendingSignatureRequest.type !== "appSession:buyPixelsRequest") {
            console.error("No pending buy pixels request");
            return;
        }

        try {
            await handleParticipantASignature(pendingSignatureRequest as AppSessionBuyPixelsRequestMessage);
            setPendingSignatureRequest(null);
        } catch (error) {
            console.error("Failed to sign and buy pixels:", error);
            setErrorMessage("Failed to sign and buy pixels");
        }
    }, [pendingSignatureRequest, handleParticipantASignature]);

    // Reset game state
    const resetGame = useCallback(() => {
        setErrorMessage(null);
        setPendingSignatureRequest(null);
    }, []);

    // TODO: Add integration with @erc7824/nitrolite for persisting game state

    return {
        errorMessage,
        formatShortAddress,
        resetGame,
        pendingSignatureRequest,
        signAndStartGame,
        isSigningInProgress,
        signatureError,
    };
}
