import { useState, useCallback } from "react";
import type { MapState, Pixel } from "../types/map";

export function useMap() {
    const [state, setState] = useState<MapState>({
        pixels: new Map(),
        selectedPixelIds: new Set(),
        isLoading: true,
        error: null,
    });

    const fetchMap = useCallback(async () => {
        try {
            // Mock API call - replace with actual endpoint
            const mockPixels = Array.from({ length: 3030 }, (_, index) => ({
                id: index + 1,
                color: Math.floor(Math.random() * 0xffffff),
            }));

            setState((prev) => {
                const newPixels = new Map(mockPixels.map((p) => [p.id, p]));

                // Preserve colors for selected pixels
                prev.selectedPixelIds.forEach((id) => {
                    const existingPixel = prev.pixels.get(id);
                    if (existingPixel) {
                        newPixels.set(id, existingPixel);
                    }
                });

                return {
                    ...prev,
                    pixels: newPixels,
                    error: null,
                };
            });
        } catch (err) {
            setState((prev) => ({ ...prev, error: "Failed to fetch map data" }));
        } finally {
            setState((prev) => ({ ...prev, isLoading: false }));
        }
    }, []);

    const updatePixelColor = useCallback((pathId: string, color: string) => {
        const pixelId = parseInt(pathId.replace("path-", ""));
        const colorNumber = parseInt(color.replace("#", ""), 16);

        setState((prev) => {
            const newPixels = new Map(prev.pixels);
            const pixel = newPixels.get(pixelId);
            if (pixel) {
                newPixels.set(pixelId, { ...pixel, color: colorNumber });
            }
            return { ...prev, pixels: newPixels };
        });
    }, []);

    const togglePixelSelection = useCallback((pathId: string) => {
        const pixelId = parseInt(pathId.replace("path-", ""));

        setState((prev) => {
            const newSelectedIds = new Set(prev.selectedPixelIds);
            if (newSelectedIds.has(pixelId)) {
                newSelectedIds.delete(pixelId);
            } else {
                newSelectedIds.add(pixelId);
            }
            return { ...prev, selectedPixelIds: newSelectedIds };
        });
    }, []);

    const isPixelSelected = useCallback(
        (pathId: string) => {
            const pixelId = parseInt(pathId.replace("path-", ""));
            return state.selectedPixelIds.has(pixelId);
        },
        [state.selectedPixelIds]
    );

    const getPixelColor = useCallback(
        (pathId: string) => {
            const pixelId = parseInt(pathId.replace("path-", ""));
            const pixel = state.pixels.get(pixelId);
            return pixel ? `#${pixel.color.toString(16).padStart(6, "0")}` : "#2AFF6B";
        },
        [state.pixels]
    );

    return {
        state,
        fetchMap,
        togglePixelSelection,
        isPixelSelected,
        getPixelColor,
        updatePixelColor,
    };
}
