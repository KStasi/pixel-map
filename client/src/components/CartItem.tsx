import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";

interface CartItemProps {
    coordinates: string;
    price: number;
    color: string;
    onDelete: () => void;
}

export function CartItem({ coordinates, price, color, onDelete }: CartItemProps) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg ${color}`} />
                <div>
                    <div className="font-medium text-gray-900">{coordinates}</div>
                    <div className="text-sm text-gray-500">${price.toFixed(2)}</div>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-gray-500 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}
