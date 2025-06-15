import { useState, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { Header } from "./components/Header";
import { Map } from "./components/Map";
import "./App.css";
import { useWebSocketNitrolite } from "./hooks/useWebSocketNitrolite";
import { useNitroliteIntegration } from "./hooks/useNitroliteIntegration";
import { useNitrolite } from "./context/NitroliteClientWrapper";

function App() {
    // Player's Ethereum address - now managed by useMetaMask hook in Lobby

    // WebSocket connection
    const { error: wsError, lastMessage } = useWebSocket();
    useWebSocketNitrolite();
    const { client, loading: nitroliteLoading, error: nitroliteError } = useNitrolite();

    // Initialize the Nitrolite integration
    const { initializeNitroliteClient } = useNitroliteIntegration();

    // When the Nitrolite client is available, initialize it
    useEffect(() => {
        if (client && !nitroliteLoading && !nitroliteError) {
            console.log("Initializing Nitrolite client in App component");
            initializeNitroliteClient(client);
        } else if (nitroliteError) {
            console.error("Nitrolite client error:", nitroliteError);
        }
    }, [client, nitroliteLoading, nitroliteError, initializeNitroliteClient]);

    // Handle errors
    const [showError, setShowError] = useState<boolean>(false);
    const [errorDisplay, setErrorDisplay] = useState<string | null>(null);

    useEffect(() => {
        // Combine all possible error sources
        const combinedError = wsError || nitroliteError;

        if (combinedError) {
            console.log("Error detected:", combinedError);

            // Don't show error modal for MetaMask connection message
            if (combinedError === "MetaMask not connected. Please connect your wallet.") {
                setShowError(false);
                setErrorDisplay(null);
            } else {
                setShowError(true);
                setErrorDisplay(combinedError);
            }
        } else {
            setShowError(false);
            setErrorDisplay(null);
        }
    }, [wsError, nitroliteError]);

    // Handle error close
    const handleErrorClose = () => {
        setShowError(false);
    };

    return (
        <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
            {/* Header - Add z-50 to ensure it's above all other elements */}
            <div className="relative z-50">
                <Header />
            </div>
            {/* Map under header */}
            <div className="w-full flex justify-center py-4 relative z-40">
                <Map />
            </div>
        </div>
    );
}

export default App;
