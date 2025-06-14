import { X } from "lucide-react";
import { Button } from "./ui/button";
import { CartItem } from "./CartItem";

interface AccountPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Mock data
const mockBalance = 1000;
const mockCartItems = [
    { id: 1, coordinates: "-101:222", price: 50, color: "bg-blue-500" },
    { id: 2, coordinates: "45:67", price: 75, color: "bg-green-500" },
    { id: 3, coordinates: "123:-456", price: 100, color: "bg-purple-500" },
];

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
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
                        {mockCartItems.map((item) => (
                            <CartItem
                                key={item.id}
                                coordinates={item.coordinates}
                                price={item.price}
                                color={item.color}
                                onDelete={() => console.log("Delete item:", item.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
