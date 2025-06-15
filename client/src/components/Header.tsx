import { useState } from "react";
import { Button } from "./ui/button";
import { AccountPanel } from "./AccountPanel";
import { useAccount } from "wagmi";
import { StyledWalletButton } from "./ui/styled-wallet-button";

export function Header() {
    const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
    const { address, isConnected: isWalletConnected } = useAccount();

    return (
        <header className="w-full h-16 px-4 flex items-center justify-between border-b">
            <h1 className="text-2xl font-bold">MapMapMap</h1>
            {isWalletConnected ? (
                <Button onClick={() => setIsAccountPanelOpen(true)} variant="outline">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}
                </Button>
            ) : (
                <StyledWalletButton />
            )}
            <AccountPanel isOpen={isAccountPanelOpen} onClose={() => setIsAccountPanelOpen(false)} />
        </header>
    );
}
