import { useNitroliteIntegration } from "./useNitroliteIntegration";
import { useChannel } from "./useChannel";
import { useWebSocketContext } from "../context/WebSocketContext";
import { useAccount } from "wagmi";

export function useBalance() {
    const { isWsConnected } = useNitroliteIntegration();
    const { checkForExistingChannel } = useChannel();
    const { client } = useWebSocketContext();
    const { address } = useAccount();

    const getBalance = async () => {
        console.log("Checking balance...");
        console.log("WebSocket connected:", isWsConnected);

        const channelStatus = await checkForExistingChannel();
        console.log("Channel status:", channelStatus);

        if (isWsConnected && client && address) {
            try {
                console.log("Getting ledger balances for address:", address);
                const ledgerBalances = (await client.getLedgerBalances(address as `0x${string}`)) as [
                    {
                        asset: string;
                        amount: string;
                    }[]
                ];
                console.log("Ledger balances:", ledgerBalances);
                return Number(ledgerBalances[0].find((balance) => balance.asset === "usdc")?.amount || "0");
            } catch (error) {
                console.error("Error getting ledger balances:", error);
            }
        }

        // For now, just return 0 as requested
        return 0;
    };

    return {
        getBalance,
    };
}
