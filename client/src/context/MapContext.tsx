import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";

interface SelectedPath {
    id: string;
    coordinates: string;
    color: string;
}

interface MapContextType {
    selectedPaths: SelectedPath[];
    svgRef: React.RefObject<HTMLObjectElement | null>;
    initializeMapPaths: () => void;
    handlePathClick: (pathId: string) => void;
}

const MapContext = createContext<MapContextType | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
    const svgRef = useRef<HTMLObjectElement>(null);
    const [selectedPaths, setSelectedPaths] = useState<SelectedPath[]>([]);

    const handlePathClick = useCallback((pathId: string) => {
        const svgDoc = svgRef.current?.contentDocument;
        if (!svgDoc) return;

        const path = svgDoc.getElementById(pathId);
        if (!path) return;

        setSelectedPaths((prevPaths) => {
            const isSelected = prevPaths.some((p) => p.id === pathId);

            if (isSelected) {
                // If already selected, remove it and restore original color
                path.style.fill = "#2AFF6B";
                return prevPaths.filter((p) => p.id !== pathId);
            } else {
                // If not selected, add it and set yellow color
                path.style.fill = "#FFD700";

                // Extract coordinates from path ID (format: "path-X:Y")
                const coords = pathId.replace("path-", "");
                const formattedCoords = `Id: ${coords}`;

                return [
                    ...prevPaths,
                    {
                        id: pathId,
                        coordinates: formattedCoords,
                        color: "bg-yellow-500",
                    },
                ];
            }
        });
    }, []);

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
            path.style.fill = "#2AFF6B"; // Set initial color to green
        });
    }, [handlePathClick]);

    useEffect(() => {
        const objectElement = svgRef.current;
        if (!objectElement) return;

        const handleLoad = () => {
            console.log("SVG loaded");
            initializeMapPaths();
        };

        if (objectElement.contentDocument) {
            handleLoad();
        }

        objectElement.addEventListener("load", handleLoad);
        return () => {
            objectElement.removeEventListener("load", handleLoad);
        };
    }, [initializeMapPaths]);

    return (
        <MapContext.Provider
            value={{
                selectedPaths,
                svgRef,
                initializeMapPaths,
                handlePathClick,
            }}
        >
            {children}
        </MapContext.Provider>
    );
}

export function useMap() {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error("useMap must be used within a MapProvider");
    }
    return context;
}
