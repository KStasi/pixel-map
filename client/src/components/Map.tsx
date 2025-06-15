import { useEffect } from "react";
import map from "/map-transparent.svg";
import { useMapContext } from "../context/MapContext";

export function Map() {
    const { svgRef, initializeMapPaths, isLoading, error } = useMapContext();

    useEffect(() => {
        const objectElement = svgRef.current;
        if (!objectElement) return;

        const handleLoad = () => {
            console.log("SVG loaded in Map component");
            // Small delay to ensure SVG is fully loaded and accessible
            setTimeout(() => {
                initializeMapPaths();
            }, 100);
        };

        // If SVG is already loaded, initialize immediately
        if (objectElement.contentDocument) {
            console.log("SVG already loaded in Map component, initializing immediately");
            handleLoad();
        }

        // Add load listener for when SVG loads
        objectElement.addEventListener("load", handleLoad);

        return () => {
            objectElement.removeEventListener("load", handleLoad);
        };
    }, [svgRef, initializeMapPaths]);

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div className="min-w-[1450px] min-h-[800px] flex items-center justify-center bg-cover bg-center">
            <object
                ref={svgRef}
                data={map}
                type="image/svg+xml"
                className="w-full h-full"
                style={{
                    display: "block",
                    margin: "0",
                    pointerEvents: "auto",
                    backgroundColor: "black",
                    color: "black",
                }}
            />
        </div>
    );
}
