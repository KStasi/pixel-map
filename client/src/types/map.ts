export interface Pixel {
    id: number;
    color: number;
    price?: number;
}

export interface MapState {
    pixels: Map<number, Pixel>;
    selectedPixelIds: Set<number>;
    isLoading: boolean;
    error: string | null;
}

export interface MapContextType {
    svgRef: React.RefObject<HTMLObjectElement | null>;
    selectedPixelIds: Set<number>;
    togglePixelSelection: (pathId: string) => void;
    getPixelColor: (pathId: string) => string;
    isLoading: boolean;
    error: string | null;
    initializeMapPaths: () => void;
}
