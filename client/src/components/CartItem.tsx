import { Trash2, Palette } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";

interface CartItemProps {
    coordinates: string;
    price: number;
    color: string;
    onDelete: () => void;
    onColorChange?: (color: string) => void;
}

export function CartItem({ coordinates, price, color, onDelete, onColorChange }: CartItemProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value;
        onColorChange?.(newColor);
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Button
                        variant="outline"
                        size="icon"
                        className="w-12 h-12 p-0 relative overflow-hidden"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        style={{ backgroundColor: color }}
                    >
                        <Palette className="h-6 w-6 text-white/50 hover:text-white/80 transition-colors" />
                    </Button>
                    {showColorPicker && (
                        <div className="absolute top-14 left-0 z-10 bg-white p-2 rounded-lg shadow-lg border">
                            <Input
                                type="color"
                                value={color}
                                onChange={handleColorChange}
                                className="w-32 h-32 cursor-pointer"
                            />
                        </div>
                    )}
                </div>
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
