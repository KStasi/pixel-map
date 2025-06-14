import { useEffect, useRef } from "react";
import map from "/map-transparent.svg";

export function Map() {
    const svgRef = useRef<HTMLObjectElement>(null);

    useEffect(() => {
        const handleSvgLoad = () => {
            const svgDoc = svgRef.current?.contentDocument;
            if (!svgDoc) return;

            const paths = svgDoc.querySelectorAll("path");
            paths.forEach((path) => {
                path.addEventListener("click", (e) => {
                    const pathId = (e.target as SVGPathElement).id;
                    console.log("Clicked path ID:", pathId);
                });
            });
        };

        const objectElement = svgRef.current;
        if (objectElement) {
            objectElement.addEventListener("load", handleSvgLoad);
        }

        return () => {
            if (objectElement) {
                objectElement.removeEventListener("load", handleSvgLoad);
            }
        };
    }, []);

    return (
        <div className="h-full min-w-[1450px] min-h-[800px] flex items-center justify-center">
            <object
                ref={svgRef}
                data={map}
                type="image/svg+xml"
                className="w-full h-full"
                style={{ display: "block", margin: "auto" }}
            />
        </div>
    );
}
