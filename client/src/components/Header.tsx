import { useState } from "react";
import { Button } from "./ui/button";
import { AccountPanel } from "./AccountPanel";

export function Header() {
    const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);

    return (
        <header className="w-full h-16 px-4 flex items-center justify-between border-b">
            <h1 className="text-2xl font-bold">Pixel Map</h1>
            <Button onClick={() => setIsAccountPanelOpen(true)} variant="outline">
                Open Account
            </Button>
            <AccountPanel isOpen={isAccountPanelOpen} onClose={() => setIsAccountPanelOpen(false)} />
        </header>
    );
}
