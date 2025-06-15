import { X } from "lucide-react";
import { Button } from "./ui/button";
import { CartItem } from "./CartItem";
import { useMapContext } from "../context/MapContext";
import { usePixelPrices } from "../hooks/usePixelPrices";
import { useMemo, useEffect, useState } from "react";
import { useBalance } from "../hooks/useBalance";
import { useWebSocket } from "../hooks/useWebSocket";
import { useWebSocketContext } from "../context/WebSocketContext";
import type { PixelInfo } from "../types";
import { useAccount } from "wagmi";

interface AccountPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const SERVER_ADDRESS = "0xdec549172c803425EB96c11D42fe18874037be0D";

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
    const mapContext = useMapContext();
    const { prices, isLoading: isLoadingPrices } = usePixelPrices();
    const { getBalance } = useBalance();
    const [balance, setBalance] = useState(0);
    const { sendAppSessionBuyPixels } = useWebSocket();
    const { keyPair } = useWebSocketContext();
    const { client } = useWebSocketContext();
    const { address } = useAccount();

    useEffect(() => {
        if (isOpen) {
            getBalance().then(setBalance);
        }
    }, [isOpen, getBalance]);

    const selectedPixels = useMemo(() => {
        return Array.from(mapContext?.selectedPixelIds).map((id) => ({
            id,
            pathId: `path-${id}`,
            price: prices.find((p) => p.id === id)?.price ?? 0,
        }));
    }, [mapContext?.selectedPixelIds, prices]);

    const total = useMemo(() => {
        return selectedPixels.reduce((sum, pixel) => sum + pixel.price, 0).toFixed(2);
    }, [selectedPixels]);

    const handleColorChange = (pathId: string, newColor: string) => {
        mapContext?.updatePixelColor(pathId, newColor);
    };

    const handlePaintSelected = async () => {
        if (!keyPair?.privateKey || !mapContext?.selectedPixelIds.size) return;

        try {
            // Prepare pixel info for the request
            const formattedParticipant = address as `0x${string}`;
            const pixels: PixelInfo[] = selectedPixels.map((pixel) => ({
                id: pixel.id,
                color: mapContext.getPixelColor(pixel.pathId) || "#FFD700",
                price: pixel.price,
            }));

            const totalAmount = parseFloat(total); // * DECIMALS;

            const nonce = Date.now();
            const appDefinition = {
                protocol: "viper_duel_nitrolite_v0",
                participants: [formattedParticipant, SERVER_ADDRESS] as `0x${string}`[],
                weights: [0, 100],
                quorum: 100,
                challenge: 0,
                nonce: nonce,
            };

            const appSessionData = [
                {
                    definition: appDefinition,
                    allocations: [
                        {
                            participant: formattedParticipant as `0x${string}`,
                            asset: "usdc",
                            amount: totalAmount.toString(),
                        },
                        {
                            participant: SERVER_ADDRESS as `0x${string}`,
                            asset: "usdc",
                            amount: "0",
                        },
                    ],
                },
            ];
            const signedMessage = (await client?.prepareAppSessionMessage(appSessionData)) as string;
            console.log("signedMessage", signedMessage);

            const parsedMessage = JSON.parse(signedMessage);
            console.log("parsedMessage", parsedMessage);
            const requestToSign = parsedMessage.req;
            console.log("requestToSign", requestToSign);

            // Send the buy pixels request
            sendAppSessionBuyPixels(
                address as `0x${string}`,
                pixels,
                parseFloat(total),
                parsedMessage.sig,
                requestToSign
            );
        } catch (error) {
            console.error("Failed to paint selected pixels:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end">
            <div className="w-96 bg-white h-full flex flex-col">
                {/* Header - Fixed */}
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">Account</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-6 h-6 text-gray-900" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Balance Section */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">Balance</h3>
                        <p className="text-3xl font-bold text-gray-900">${balance.toFixed(2)}</p>
                        <div className="flex gap-2 mt-4">
                            <a
                                href="https://app.uniswap.org/swap"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1"
                            >
                                <Button variant="outline" className="w-full">
                                    Buy
                                </Button>
                            </a>
                            <a
                                href="https://app.uniswap.org/swap"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1"
                            >
                                <Button variant="outline" className="w-full">
                                    Withdraw
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Cart Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">Cart</h3>
                        <div className="space-y-3">
                            {selectedPixels.map((pixel) => (
                                <CartItem
                                    key={pixel.pathId}
                                    coordinates={`Id: ${pixel.id}`}
                                    price={pixel.price}
                                    color={mapContext?.getPixelColor(pixel.pathId) || "#FFD700"}
                                    onDelete={() => mapContext?.togglePixelSelection(pixel.pathId)}
                                    onColorChange={(newColor) => handleColorChange(pixel.pathId, newColor)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="p-6 border-t bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <span className="text-xl font-bold text-gray-900">${total}</span>
                    </div>
                    <Button
                        className="w-full text-black"
                        onClick={handlePaintSelected}
                        disabled={!mapContext?.selectedPixelIds.size}
                    >
                        Paint Selected
                    </Button>
                </div>
            </div>
        </div>
    );
}
