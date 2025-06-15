import { useState, useEffect } from "react";

interface PixelPrice {
    id: number;
    price: number;
}

export function usePixelPrices() {
    const [prices, setPrices] = useState<PixelPrice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPrices = async () => {
        try {
            // Mock API call - in real implementation, replace with actual API endpoint
            const mockPrices: PixelPrice[] = Array.from({ length: 3030 }, (_, index) => ({
                id: index + 1,
                price: Math.random() * 10, // Random price between 0 and 1000
            }));

            console.log(mockPrices);

            setPrices(mockPrices);
            setError(null);
        } catch (err) {
            setError("Failed to fetch pixel prices");
            console.error("Error fetching pixel prices:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();

        // Set up periodic updates every 15 seconds
        const intervalId = setInterval(fetchPrices, 15000);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, []);

    const getPriceById = (id: number): number | undefined => {
        return prices.find((pixel) => pixel.id === id)?.price;
    };

    const getPriceByPathId = (pathId: string): number | undefined => {
        // Extract numeric ID from path ID (format: "path-X:Y")
        const numericId = parseInt(pathId.replace("path-", "").replace(":", ""));
        return getPriceById(numericId);
    };

    return {
        prices,
        isLoading,
        error,
        getPriceById,
        getPriceByPathId,
        refreshPrices: fetchPrices,
    };
}
