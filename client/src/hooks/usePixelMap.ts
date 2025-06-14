import { useState, useEffect } from "react";

interface PixelMap {
    id: number;
    color: number;
}

export function usePixelMap() {
    const [mapData, setMapData] = useState<PixelMap[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPaths, setSelectedPaths] = useState<Set<number>>(new Set());

    const fetchMap = async () => {
        try {
            // Mock API call - in real implementation, replace with actual API endpoint
            const mockMapData: PixelMap[] = Array.from({ length: 3030 }, (_, index) => ({
                id: index + 1,
                color: Math.floor(Math.random() * 0xffffff), // Random color
            }));

            // Preserve colors for selected paths
            setMapData((prevData) => {
                const newData = [...mockMapData];
                selectedPaths.forEach((id) => {
                    const existingPixel = prevData.find((pixel) => pixel.id === id);
                    if (existingPixel) {
                        const index = newData.findIndex((pixel) => pixel.id === id);
                        if (index !== -1) {
                            newData[index] = existingPixel;
                        }
                    }
                });
                return newData;
            });

            setError(null);
        } catch (err) {
            setError("Failed to fetch map data");
            console.error("Error fetching map data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMap();

        // Set up periodic updates every 5 seconds
        const intervalId = setInterval(fetchMap, 5000);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, [selectedPaths]); // Re-run effect when selectedPaths changes

    const getPixelById = (id: number): PixelMap | undefined => {
        return mapData.find((pixel) => pixel.id === id);
    };

    const getPixelByPathId = (pathId: string): PixelMap | undefined => {
        // Extract numeric ID from path ID (format: "path-X:Y")
        const numericId = parseInt(pathId.replace("path-", "").replace(":", ""));
        return getPixelById(numericId);
    };

    const selectPath = (id: number) => {
        setSelectedPaths((prev) => new Set([...prev, id]));
    };

    const deselectPath = (id: number) => {
        setSelectedPaths((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    };

    const isPathSelected = (id: number): boolean => {
        return selectedPaths.has(id);
    };

    return {
        mapData,
        isLoading,
        error,
        getPixelById,
        getPixelByPathId,
        refreshMap: fetchMap,
        selectPath,
        deselectPath,
        isPathSelected,
        selectedPaths: Array.from(selectedPaths),
    };
}
