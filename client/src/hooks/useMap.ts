import { useState, useCallback, useRef, useEffect } from "react";
import type { MapState, Pixel } from "../types/map";
import { useWebSocket } from "./useWebSocket";

export function useMap() {
    const [state, setState] = useState<MapState>({
        pixels: new Map(),
        selectedPixelIds: new Set(),
        isLoading: true,
        error: null,
    });
    // Store local color overrides for selected pixels
    const localSelectedColors = useRef(new Map<number, string>());
    const { dbMap, sendRequestMapState } = useWebSocket();

    const fetchMap = useCallback(async () => {
        try {
            let mockPixels: Pixel[] = [];
            if (dbMap) {
                console.log("dbMap", dbMap);
                mockPixels = Array.from(dbMap.values());
                setState((prev) => {
                    const newPixels = new Map(mockPixels.map((p) => [p.id, p]));
                    // Remove local color for unselected pixels
                    for (const id of localSelectedColors.current.keys()) {
                        if (!prev.selectedPixelIds.has(id)) {
                            localSelectedColors.current.delete(id);
                        }
                    }
                    return {
                        ...prev,
                        pixels: newPixels,
                        error: null,
                    };
                });
            } else {
            }
        } catch (err) {
            setState((prev) => ({ ...prev, error: "Failed to fetch map data" }));
        } finally {
            setState((prev) => ({ ...prev, isLoading: false }));
        }
    }, [dbMap]);

    const updatePixelColor = useCallback((pathId: string, color: string) => {
        const pixelId = parseInt(pathId.replace("path-", ""));
        localSelectedColors.current.set(pixelId, color);
        setState((prev) => ({ ...prev })); // trigger rerender
    }, []);

    const togglePixelSelection = useCallback((pathId: string) => {
        const pixelId = parseInt(pathId.replace("path-", ""));
        setState((prev) => {
            const newSelectedIds = new Set(prev.selectedPixelIds);
            if (newSelectedIds.has(pixelId)) {
                newSelectedIds.delete(pixelId);
                localSelectedColors.current.delete(pixelId);
            } else {
                newSelectedIds.add(pixelId);
                // Set initial local color to current server color
                const pixel = prev.pixels.get(pixelId);
                if (pixel) {
                    localSelectedColors.current.set(pixelId, pixel.color);
                }
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
            if (state.selectedPixelIds.has(pixelId) && localSelectedColors.current.has(pixelId)) {
                return localSelectedColors.current.get(pixelId)!;
            }
            const pixel = state.pixels.get(pixelId);
            return pixel ? pixel.color : "#2AFF6B";
        },
        [state.pixels, state.selectedPixelIds]
    );
    useEffect(() => {
        console.log("sending map state");
        sendRequestMapState();
        const intervalId = setInterval(sendRequestMapState, 5000);
        return () => clearInterval(intervalId);
    }, [sendRequestMapState]);

    // Initial fetch and periodic updates
    useEffect(() => {
        fetchMap();

        const intervalId = setInterval(fetchMap, 5000);
        return () => clearInterval(intervalId);
    }, [fetchMap, dbMap]);

    return {
        state,
        fetchMap,
        togglePixelSelection,
        isPixelSelected,
        getPixelColor,
        updatePixelColor,
    };
}
