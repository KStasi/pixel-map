import { WalletButton } from "@rainbow-me/rainbowkit";
import { Wallet, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface StyledWalletButtonProps {
    className?: string;
    variant?: "viperGreen" | "viperPurple";
    size?: "default" | "sm" | "lg" | "xl" | "xxl";
    disabled?: boolean;
}

export function StyledWalletButton({
    className,
    variant = "viperGreen",
    size = "sm",
    disabled = false,
}: StyledWalletButtonProps) {
    const baseClasses = cn(
        // Base styling
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none border",

        // Size variants
        {
            "h-8 px-4 text-xs": size === "sm",
            "h-10 px-6 py-2 text-sm": size === "default",
            "h-12 px-8 text-base": size === "lg",
            "h-14 px-10 text-lg font-medium": size === "xl",
            "h-16 px-12 text-xl font-medium": size === "xxl",
        },

        // Variant styling
        {
            "bg-viper-green text-viper-charcoal shadow-sm hover:bg-viper-green/90 border-viper-green/40 hover:border-viper-green/60 font-bold tracking-wide":
                variant === "viperGreen",

            "bg-viper-purple text-white shadow-sm hover:bg-viper-purple/90 border-viper-purple/40 hover:border-viper-purple/60 font-bold tracking-wide":
                variant === "viperPurple",
        },

        className
    );

    return (
        <WalletButton.Custom wallet="metaMask">
            {({ ready, connect, loading }) => {
                const buttonDisabled = !ready || disabled;

                return (
                    <button
                        type="button"
                        disabled={buttonDisabled}
                        onClick={connect}
                        className={cn(baseClasses, {
                            "opacity-50 cursor-not-allowed": buttonDisabled,
                        })}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Wallet className="h-4 w-4 mr-2" />
                                Connect MetaMask
                            </>
                        )}
                    </button>
                );
            }}
        </WalletButton.Custom>
    );
}
