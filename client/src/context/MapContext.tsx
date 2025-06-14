import { createContext, useContext, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { MapContextType } from "../types/map";
import { useMap } from "../hooks/useMap";

const MapContext = createContext<MapContextType | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
    const svgRef = useRef<HTMLObjectElement>(null);
    const { state, fetchMap, togglePixelSelection, isPixelSelected, getPixelColor } = useMap();

    const handlePathClick = useCallback(
        (pathId: string) => {
            const svgDoc = svgRef.current?.contentDocument;
            if (!svgDoc) return;

            const path = svgDoc.getElementById(pathId);
            if (!path) return;

            togglePixelSelection(pathId);
            path.style.fill = isPixelSelected(pathId) ? "#FFD700" : getPixelColor(pathId);
        },
        [togglePixelSelection, isPixelSelected, getPixelColor]
    );

    const handleOnMouseEnter = useCallback((pathId: string) => {
        const svgDoc = svgRef.current?.contentDocument;
        if (!svgDoc) return;

        const path = svgDoc.getElementById(pathId);
        if (!path) return;
        path.style.fill = "red";
    }, []);

    const handleOnMouseLeave = useCallback(
        (pathId: string) => {
            const svgDoc = svgRef.current?.contentDocument;
            if (!svgDoc) return;

            const path = svgDoc.getElementById(pathId);
            if (!path) return;

            if (isPixelSelected(pathId)) {
                path.style.fill = "#FFD700";
                return;
            }

            path.style.fill = getPixelColor(pathId);
        },
        [isPixelSelected, getPixelColor]
    );

    const updateMapColors = useCallback(() => {
        const svgDoc = svgRef.current?.contentDocument;
        if (!svgDoc) return;

        const paths = svgDoc.querySelectorAll("path");
        paths.forEach((path) => {
            const pathId = path.id;
            if (!pathId) return;

            if (isPixelSelected(pathId)) {
                path.style.fill = "#FFD700";
            } else {
                path.style.fill = getPixelColor(pathId);
            }
        });
    }, [isPixelSelected, getPixelColor]);

    const initializeMapPaths = useCallback(() => {
        const svgDoc = svgRef.current?.contentDocument;
        if (!svgDoc) return;

        const paths = svgDoc.querySelectorAll("path");
        console.log("Found paths:", paths.length);

        paths.forEach((path) => {
            const pathId = path.id;
            if (!pathId) return;

            path.onclick = (e) => {
                e.preventDefault();
                handlePathClick(pathId);
            };

            path.style.pointerEvents = "auto";
            path.style.cursor = "pointer";

            path.onmouseenter = (e) => {
                e.preventDefault();
                handleOnMouseEnter(pathId);
            };
            path.onmouseleave = (e) => {
                e.preventDefault();
                handleOnMouseLeave(pathId);
            };
        });

        updateMapColors();
    }, [handlePathClick, handleOnMouseEnter, handleOnMouseLeave, updateMapColors]);

    // Initial fetch and periodic updates
    useEffect(() => {
        fetchMap();
        const intervalId = setInterval(fetchMap, 5000);
        return () => clearInterval(intervalId);
    }, [fetchMap]);

    // Update colors when map data changes
    useEffect(() => {
        updateMapColors();
    }, [state.pixels, state.selectedPixelIds, updateMapColors]);

    return (
        <MapContext.Provider
            value={{
                svgRef,
                selectedPixelIds: state.selectedPixelIds,
                togglePixelSelection,
                getPixelColor,
                isLoading: state.isLoading,
                error: state.error,
                initializeMapPaths,
            }}
        >
            {children}
        </MapContext.Provider>
    );
}

export function useMapContext() {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error("useMapContext must be used within a MapProvider");
    }
    return context;
}
