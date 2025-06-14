import { X } from "lucide-react";
import { Button } from "./ui/button";
import { CartItem } from "./CartItem";
import { useMap } from "../context/MapContext";
import { usePixelPrices } from "../hooks/usePixelPrices";
import { useMemo } from "react";

interface AccountPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Mock data
const mockBalance = 1000;

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
    const { selectedPaths, handlePathClick } = useMap();
    const { prices, isLoading: isLoadingPrices } = usePixelPrices();

    const pathsWithPrices = useMemo(() => {
        return selectedPaths.map((path) => {
            const numericId = path.id.replace("path-", "").replace(":", "");
            const price = prices.find((p) => p.id.toString() === numericId)?.price ?? 0;
            return { ...path, price };
        });
    }, [selectedPaths, prices]);

    const total = useMemo(() => {
        return pathsWithPrices.reduce((sum, path) => sum + path.price, 0).toFixed(2);
    }, [pathsWithPrices]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50" onClick={onClose}>
            <div
                className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-6 text-gray-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Account</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Balance Section */}
                <div className="mb-8">
                    <div className="text-sm text-gray-600 mb-2">Balance</div>
                    <div className="text-3xl font-bold mb-4 text-gray-900">${mockBalance}</div>
                    <div className="flex gap-2">
                        <a href="https://apps.yellow.com/" target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="outline" className="w-full text-white hover:text-white">
                                Deposit
                            </Button>
                        </a>
                        <a href="https://apps.yellow.com/" target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="outline" className="w-full text-white hover:text-white">
                                Withdraw
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Cart Section */}
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Cart</h3>
                    <div className="space-y-3">
                        {pathsWithPrices.map((path) => (
                            <CartItem
                                key={path.id}
                                coordinates={path.coordinates}
                                price={path.price}
                                color={path.color}
                                onDelete={() => handlePathClick(path.id)}
                            />
                        ))}
                    </div>

                    {/* Total and Paint Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-semibold">Total:</span>
                            <span className="text-xl font-bold">${total}</span>
                        </div>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={pathsWithPrices.length === 0}
                        >
                            Paint it
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
