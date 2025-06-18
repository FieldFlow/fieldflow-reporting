"use client";

import { defineChain, getContract, prepareContractCall, ThirdwebContract } from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useState, useEffect, useCallback } from "react";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg"; // Ensure the path is correct

// --- CONFIGURATION ---
import { client } from "@/app/client"; // Ensure the path is correct
import { abi as esgRegistryABI} from '../abi'; // Ensure the path is correct

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT;
const CHAIN_ID = 44787; // Celo Alfajores Testnet
const KPI_ID_NUMERIC = 1; // Simplified: ID for 'GHGEmissionsScopeOneAndTwoTotal'

/**
 * Main page component for companies to submit ESG data.
 */
export default function ForCompaniesPage() {
    const account = useActiveAccount();
    const userAddress = account?.address ?? null;

    const [contract, setContract] = useState<ThirdwebContract | undefined>();
    const [selectedReportingYear, setSelectedReportingYear] = useState<number>(new Date().getFullYear());
    const [kpiValue, setKpiValue] = useState<string>("");

    const [status, setStatus] = useState({ message: "", isError: false, txHash: "" });

    // Thirdweb hook for sending transactions
    const { mutateAsync: sendTransaction, isPending: isSubmitting } = useSendTransaction();

    // --- 1. Contract Initialization ---
    useEffect(() => {
        if (client && CONTRACT_ADDRESS) {
            try {
                const c = getContract({
                    client,
                    chain: defineChain(CHAIN_ID),
                    address: CONTRACT_ADDRESS,
                    abi: esgRegistryABI
                });
                setContract(c);
            } catch (error) {
                console.error("Failed to initialize contract:", error);
                setStatus({ message: "Contract initialization failed.", isError: true, txHash: "" });
            }
        }
    }, []);

    // --- 2. Data Submission Function ---
    const handleSubmit = async () => {
        // Pre-submission checks
        if (!userAddress || !contract) {
            setStatus({ message: "Wallet not connected or contract not ready.", isError: true, txHash: "" });
            return;
        }
        const numericValue = parseFloat(kpiValue);
        if (isNaN(numericValue) || kpiValue.trim() === "") {
            setStatus({ message: "Please enter a valid numeric KPI value.", isError: true, txHash: "" });
            return;
        }

        setStatus({ message: "Preparing transaction...", isError: false, txHash: "" });

        try {
            // Parameters for contract function call
            const valueBigInt = BigInt(Math.round(numericValue));
            const reportingYearBigInt = BigInt(selectedReportingYear);
            const kpiTypeIdBigInt = BigInt(KPI_ID_NUMERIC);
            // This is an empty CID, as it was in your original code
            const defaultMetadataCid = "0x0000000000000000000000000000000000000000000000000000000000000000";

            // Prepare contract call
            const preparedTx = prepareContractCall({
                contract,
                method: "submitKpiVersion",
                params: [kpiTypeIdBigInt, reportingYearBigInt, valueBigInt, defaultMetadataCid]
            });

            // Send transaction via hook
            setStatus({ message: "Please confirm the transaction in your wallet...", isError: false, txHash: "" });

            const transactionResult = await sendTransaction(preparedTx);

            // --- 3. Awaiting Confirmation ---
            // All we need is to wait for the transaction to be included in a block.
            // The useSendTransaction hook already handles this for us. When await completes, the transaction is on-chain.

            console.log("Transaction result:", transactionResult);
            setStatus({
                message: `Success! Transaction confirmed.`,
                isError: false,
                txHash: transactionResult.transactionHash
            });

            setKpiValue(""); // Clear input field after success

        } catch (err) {
            console.error("Error during submission:", err);
            const finalErrorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred.';
            setStatus({ message: `Error: ${finalErrorMessage}`, isError: true, txHash: "" });
        }
    };

    return (
        <div className="relative p-4 pb-20 min-h-screen w-full mx-auto bg-gradient-to-br from-gray-900 to-blue-900 text-zinc-100 flex flex-col items-center justify-center">
            <header className="fixed top-6 w-full px-6 flex justify-between items-center z-50">
                <a href="/" className="inline-block transform hover:scale-110 transition-transform duration-300">
                    <Image src={logoIcon} alt="Home" width={50} height={50} priority />
                </a>
                <ConnectButton client={client} appMetadata={{ name: "FieldFlow ESG", url: "https://esg.filedflow.lu" }} />
            </header>

            <main className="w-full max-w-lg p-6 md:p-10 bg-white/10 backdrop-blur-md shadow-2xl rounded-xl mt-24 mb-10">
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-6">Submit ESG Data</h1>
                    {userAddress ? (
                        <p className="text-zinc-300 text-sm mb-8">
                            Connected: <span className="font-mono bg-white/20 px-2 py-1 rounded text-xs">{userAddress}</span>
                        </p>
                    ) : (
                        <p className="text-yellow-400 text-sm mb-8">Please connect your wallet.</p>
                    )}

                    <div className="mb-6">
                        <label htmlFor="reportingYearInput" className="block text-md font-semibold mb-2">Reporting Year:</label>
                        <input
                            type="number"
                            id="reportingYearInput"
                            value={selectedReportingYear}
                            onChange={(e) => setSelectedReportingYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                            className="w-full max-w-xs mx-auto border border-zinc-700 bg-white/10 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="w-full flex flex-col gap-3 p-4 bg-white/5 rounded-lg shadow-md border border-zinc-700">
                        <label className="block text-md font-semibold text-zinc-200 text-left">GHG Emissions Scope 1 & 2 (tCO2e)</label>
                        <input
                            type="number"
                            step="any"
                            placeholder={`Value for ${selectedReportingYear} year`}
                            value={kpiValue}
                            onChange={(e) => setKpiValue(e.target.value)}
                            className="w-full flex-grow border border-zinc-700 bg-white/10 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="w-full flex justify-center mt-6">
                        <button
                            onClick={handleSubmit}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting || !userAddress}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Data to Blockchain"}
                        </button>
                    </div>

                    {status.message && (
                        <div className="mt-6 w-full bg-white/10 p-3 rounded-lg break-words">
                            <p className={`text-sm font-medium ${status.isError ? "text-red-400" : "text-green-400"}`}>
                                {status.message}
                            </p>
                            {status.txHash && (
                                <a
                                    href={`https://alfajores.celoscan.io/tx/${status.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline text-xs mt-2 block"
                                >
                                    View Transaction
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
