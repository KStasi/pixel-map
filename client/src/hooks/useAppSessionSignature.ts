import { useState, useCallback } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import { createEthersSigner } from "../context/createSigner";
import type { AppSessionSignatureRequestMessage, AppSessionBuyPixelsRequestMessage, PixelInfo } from "../types";

/**
 * Hook for handling app session signature requests
 */
export function useAppSessionSignature(
    sendBuyPixels?: (eoa: string, pixels: PixelInfo[], totalPrice: number, signature: string) => void
) {
    const [isSigningInProgress, setIsSigningInProgress] = useState(false);
    const [signatureError, setSignatureError] = useState<string | null>(null);
    const { keyPair } = useWebSocketContext();

    /**
     * Signs an app session message and sends it to the server
     */
    const signAppSessionMessage = useCallback(
        async (
            roomId: string,
            requestToSign: unknown[],
            messageType: "appSession:signature" | "appSession:buyPixels"
        ) => {
            if (!keyPair?.privateKey) {
                throw new Error("No private key available for signing");
            }

            setIsSigningInProgress(true);
            setSignatureError(null);

            try {
                // Create a signer from the local private key
                const signer = createEthersSigner(keyPair.privateKey);
                console.log("Client signer created with address:", signer.address);
                console.log("Client signing request structure:", JSON.stringify(requestToSign, null, 2));

                // Sign the exact same request structure that the server generated
                // This ensures all participants sign the identical payload
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const signature = await signer.sign(requestToSign as any);
                console.log("Client signature created:", signature);

                // Send the signature to the server using the provided callback
                if (messageType === "appSession:signature" && sendSignature) {
                    sendSignature(roomId, signature);
                } else if (messageType === "appSession:buyPixels" && sendBuyPixels) {
                    sendBuyPixels(eoa, pixels, totalPrice, signature);
                } else {
                    throw new Error("No send function available for message type: " + messageType);
                }

                setIsSigningInProgress(false);
                return signature;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown signing error";
                console.error("App session signing error:", errorMessage);
                setSignatureError(errorMessage);
                setIsSigningInProgress(false);
                throw error;
            }
        },
        [keyPair, sendSignature, sendBuyPixels]
    );

    /**
     * Handles participant B signature request (when joining)
     */
    const handleParticipantBSignature = useCallback(
        async (message: AppSessionSignatureRequestMessage) => {
            try {
                await signAppSessionMessage(message.roomId, message.requestToSign, "appSession:signature");
            } catch (error) {
                console.error("Failed to sign as participant B:", error);
                throw error;
            }
        },
        [signAppSessionMessage]
    );

    /**
     * Handles participant A signature request (when starting game)
     */
    const handleParticipantASignature = useCallback(
        async (message: AppSessionBuyPixelsRequestMessage) => {
            try {
                await signAppSessionMessage(message.roomId, message.requestToSign, "appSession:buyPixels");
            } catch (error) {
                console.error("Failed to sign as participant A:", error);
                throw error;
            }
        },
        [signAppSessionMessage]
    );

    return {
        isSigningInProgress,
        signatureError,
        handleParticipantBSignature,
        handleParticipantASignature,
        signAppSessionMessage,
    };
}
