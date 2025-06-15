/**
 * Game and WebSocket types for Viper Duel
 */

import type { CreateAppSessionRequest } from "@erc7824/nitrolite";

export interface PixelInfo {
    id: number;
    price: number;
    color: string;
}

// Room join payload
export interface BuyPixelsPayload {
    eoa: string;
    pixels: PixelInfo[];
    totalPrice: number;
}

// WebSocket message types
export type WebSocketMessageType =
    | "buyPixels"
    | "map:state"
    | "purchase:success"
    | "purchase:failed"
    | "error"
    | "appSession:signatureRequest"
    | "appSession:buyPixelsRequest"
    | "appSession:signatureConfirmed"
    | "appSession:signature"
    | "appSession:buyPixels";

// Base WebSocket message
export interface WebSocketMessage {
    type: WebSocketMessageType;
}

// Client -> Server messages

export interface BuyPixelsMessage extends WebSocketMessage {
    type: "buyPixels";
    payload: BuyPixelsPayload;
}

// Server -> Client messages

export interface MapStateMessage extends WebSocketMessage {
    type: "map:state";
    pixels: PixelInfo[];
}

export interface PurchaseSuccessMessage extends WebSocketMessage {
    type: "purchase:success";
}

export interface PurchaseFailedMessage extends WebSocketMessage {
    type: "purchase:failed";
}

export interface ErrorMessage extends WebSocketMessage {
    type: "error";
    code: string;
    msg: string;
}

// App Session related messages

export interface AppSessionSignatureRequestMessage extends WebSocketMessage {
    type: "appSession:signatureRequest";
    roomId: string;
    appSessionData: CreateAppSessionRequest[];
    appDefinition: unknown;
    participants: string[];
    requestToSign: unknown[];
}

export interface AppSessionBuyPixelsRequestMessage extends WebSocketMessage {
    type: "appSession:buyPixelsRequest";
    roomId: string;
    appSessionData: CreateAppSessionRequest[];
    appDefinition: unknown;
    participants: string[];
    requestToSign: unknown[];
}

export interface AppSessionSignatureConfirmedMessage extends WebSocketMessage {
    type: "appSession:signatureConfirmed";
    roomId: string;
}

export interface AppSessionSignatureMessage extends WebSocketMessage {
    type: "appSession:signature";
    payload: {
        roomId: string;
        signature: string;
    };
}

export interface AppSessionBuyPixelsMessage extends WebSocketMessage {
    type: "appSession:buyPixels";
    payload: {
        eoa: string;
        pixels: PixelInfo[];
        totalPrice: number;
        signature: string;
    };
}

// Union type for all WebSocket messages
export type WebSocketMessages =
    | MapStateMessage
    | PurchaseSuccessMessage
    | PurchaseFailedMessage
    | ErrorMessage
    | AppSessionSignatureRequestMessage
    | AppSessionBuyPixelsRequestMessage
    | AppSessionSignatureConfirmedMessage
    | AppSessionSignatureMessage
    | AppSessionBuyPixelsMessage;

// MetaMask Ethereum Provider
export interface MetaMaskEthereumProvider {
    isMetaMask?: boolean;
    request: (request: { method: string; params?: Array<any> }) => Promise<any>;
    on: (event: string, listener: (...args: any[]) => void) => void;
    removeListener: (event: string, listener: (...args: any[]) => void) => void;
    selectedAddress?: string;
    isConnected?: () => boolean;
}

// Add type definition for window.ethereum
declare global {
    interface Window {
        ethereum?: MetaMaskEthereumProvider;
    }
}
