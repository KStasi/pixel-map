import { createContext, useContext, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { MapContextType, MapState } from "../types/map";
import { useMap } from "../hooks/useMap";

const MapContext = createContext<MapContextType | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
    const svgRef = useRef<HTMLObjectElement>(null);
    const { state, togglePixelSelection, isPixelSelected, getPixelColor, updatePixelColor } = useMap();

    const handlePathClick = useCallback(
        (pathId: string) => {
            const svgDoc = svgRef.current?.contentDocument;
            if (!svgDoc) return;

            const path = svgDoc.getElementById(pathId);
            if (!path) return;

            togglePixelSelection(pathId);
            const isSelected = isPixelSelected(pathId);
            path.style.fill = getPixelColor(pathId);
            path.style.stroke = isSelected ? "#FFD700" : "none";
            path.style.strokeWidth = isSelected ? "2" : "0";
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
            path.style.fill = getPixelColor(pathId);
        },
        [getPixelColor]
    );

    const updateMapColors = useCallback(() => {
        const svgDoc = svgRef.current?.contentDocument;
        if (!svgDoc) return;

        const paths = svgDoc.querySelectorAll("path");
        paths.forEach((path) => {
            const pathId = path.id;
            if (!pathId) return;
            const isSelected = isPixelSelected(pathId);
            const color = getPixelColor(pathId);
            path.style.fill = color;
            path.style.stroke = isSelected ? "#FFD700" : "none";
            path.style.strokeWidth = isSelected ? "2" : "0";
        });
    }, [getPixelColor, isPixelSelected]);

    const handleColorUpdate = useCallback(
        (pathId: string, color: string) => {
            updatePixelColor(pathId, color);
            // Ensure the SVG is updated after state change
            setTimeout(() => {
                updateMapColors();
            }, 0);
        },
        [updatePixelColor, updateMapColors]
    );

    const initializeMapPaths = useCallback(() => {
        const svgDoc = svgRef.current?.contentDocument;
        if (!svgDoc) return;

        const paths = svgDoc.querySelectorAll("path");

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
                updatePixelColor: handleColorUpdate,
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
