"use client";

import { defineChain, getContract, prepareContractCall, ThirdwebContract, PreparedTransaction, TransactionReceipt, watchContractEvents, Hex, AbiEvent } from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg";
import { Tooltip } from "react-tooltip";

// Import the contract ABI JSON file
import { abi as esgRegistryABI } from '../../../public/VersionedPersonalESGRegistry.json';
// Correct Thirdweb client import
import { client } from "@/app/client";

// --- CONTRACT CONFIGURATION ---
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT;
const CHAIN_ID = 44787; // Celo Alfajores Testnet

// --- MAPPING STRING KPI IDs TO NUMERIC FOR THE CONTRACT ---
// Using full, readable identifiers for clarity
const kpiIdToNumericIdMap: Record<string, number> = {
    'GHGEmissionsScopeOneAndTwoTotal': 1,
    // Other KPIs can be added here as needed
};

// --- Pre-loaded IPFS CIDs for dropdowns (for PoC demonstration) ---
// In a real application, these CIDs would point to actual files on IPFS.
// NOTE: These values are placeholders. In a real application these would be actual bytes32 representations of IPFS CIDs.
const preloadedCids: { label: string; cid: Hex }[] = []; // In current form, no fields use preloadedCids

// --- DATA TYPES ---
// Type for KpiVersionSubmitted event data
type KpiVersionSubmittedEventData = {
    kpiOwner: Hex;
    kpiTypeId: bigint;
    reportingYear: bigint;
    value: bigint;
    metadataCid: Hex;
    submissionTimestamp: bigint;
    version: bigint;
};

// --- CUSTOM HOOKS ---

/**
 * Hook to initialize and get a Thirdweb contract instance.
 * @returns {ThirdwebContract<typeof esgRegistryABI> | undefined} Contract instance or undefined if client is not ready.
 */
function useEsgContract() {
    const [contract, setContract] = useState<ThirdwebContract<typeof esgRegistryABI>>();

    useEffect(() => {
        // Ensure the client is imported and available
        if (client) {
            const esgContract = getContract({
                client,
                chain: defineChain(CHAIN_ID),
                address: CONTRACT_ADDRESS,
                abi: esgRegistryABI,
            }) as ThirdwebContract<typeof esgRegistryABI>;
            setContract(esgContract);
        }
    }, []); // No dependencies, runs once on mount

    return contract;
}

/**
 * Hook for tracking and decoding KpiVersionSubmitted events.
 * @returns {(ownerAddress: string, expectedKpiTypeId: ethers.BigNumber, expectedReportingYear: ethers.BigNumber, expectedValue: ethers.BigNumber, expectedMetadataCid: Hex) => Promise<KpiVersionSubmittedEventData>} Function to await a matching event.
 */
function useKpiEventWatcher(contract: ThirdwebContract<typeof esgRegistryABI> | undefined) {
    // Create ethers.Interface from ABI for manual log decoding
    const contractInterface = new ethers.utils.Interface(esgRegistryABI);

    // Find the KpiVersionSubmitted event fragment in the ABI
    const kpiVersionSubmittedEventAbiFragment = esgRegistryABI.find(
        (item: any) => item.type === "event" && item.name === "KpiVersionSubmitted"
    ) as AbiEvent | undefined;

    const waitForMatchingEvent = useCallback((
        ownerAddress: string,
        expectedKpiTypeId: ethers.BigNumber,
        expectedReportingYear: ethers.BigNumber,
        expectedValue: ethers.BigNumber,
        expectedMetadataCid: Hex,
        timeoutMs: number = 90000 // Default timeout 90 seconds
    ): Promise<KpiVersionSubmittedEventData> => {
        return new Promise((resolve, reject) => {
            if (!contract) {
                return reject(new Error("Contract not initialized. Cannot watch events."));
            }
            if (!kpiVersionSubmittedEventAbiFragment) {
                return reject(new Error("KpiVersionSubmitted event definition not found in ABI."));
            }

            let unwatch: (() => void) | undefined;
            let timeoutId: NodeJS.Timeout | undefined;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (unwatch) {
                    console.log("Stopping event watcher due to match or timeout.");
                    unwatch();
                }
            };

            timeoutId = setTimeout(() => {
                console.warn(`Timeout (${timeoutMs / 1000}s) waiting for KpiVersionSubmitted event. Expected: KPI Type ID: ${expectedKpiTypeId.toString()}, Year: ${expectedReportingYear.toString()}, Value: ${expectedValue.toString()}`);
                cleanup();
                reject(new Error(`Timeout (${timeoutMs / 1000}s) waiting for KpiVersionSubmitted event for KPI Type ID: ${expectedKpiTypeId.toString()}, Year: ${expectedReportingYear.toString()}`));
            }, timeoutMs);

            console.log(`Starting KpiVersionSubmitted event watch. Owner: ${ownerAddress}, KPI Type: ${expectedKpiTypeId.toString()}, Year: ${expectedReportingYear.toString()}, Value: ${expectedValue.toString()}, Metadata CID: ${expectedMetadataCid}`);

            unwatch = watchContractEvents({
                contract: contract,
                events: [kpiVersionSubmittedEventAbiFragment],
                onEvents: (events) => {
                    console.log(`Event watcher received ${events.length} event(s).`);
                    for (const event of events) {
                        console.log("Received full event object:", event);

                        let parsedEventData: KpiVersionSubmittedEventData | undefined;
                        let kpiOwnerTopic: Hex | undefined;
                        let reportingYearTopic: Hex | undefined;
                        let metadataCidTopic: Hex | undefined;

                        try {
                            const eventFragment = contractInterface.getEvent("KpiVersionSubmitted");
                            if (!eventFragment) {
                                throw new Error("Failed to find event fragment for KpiVersionSubmitted.");
                            }

                            const nonIndexedInputs = eventFragment.inputs.filter(input => !input.indexed);
                            const nonIndexedTypes = nonIndexedInputs.map(input => input.type);

                            const decodedData = ethers.utils.defaultAbiCoder.decode(
                                nonIndexedTypes,
                                event.data
                            );

                            // Indexed parameters are taken from topics
                            // kpiOwner - topic1, reportingYear - topic2, metadataCid - topic3
                            kpiOwnerTopic = event.topics[1];
                            reportingYearTopic = event.topics[2];
                            metadataCidTopic = event.topics[3];

                            parsedEventData = {
                                kpiOwner: kpiOwnerTopic as Hex,
                                kpiTypeId: decodedData[0] as bigint,
                                reportingYear: ethers.BigNumber.from(reportingYearTopic).toBigInt(),
                                value: decodedData[1] as bigint,
                                metadataCid: metadataCidTopic as Hex,
                                submissionTimestamp: decodedData[2] as bigint,
                                version: decodedData[3] as bigint
                            };

                            console.log("Event data manually decoded using defaultAbiCoder:", parsedEventData);
                        } catch (parseError) {
                            console.error("Error manually decoding event log:", parseError, event);
                            continue;
                        }

                        // Check that parsedEventData is valid and contains required properties
                        if (!parsedEventData || parsedEventData.kpiOwner === undefined || parsedEventData.kpiTypeId === undefined || parsedEventData.reportingYear === undefined || parsedEventData.value === undefined || parsedEventData.metadataCid === undefined) {
                            console.warn("Parsed event data is incomplete or empty, skipping match check:", parsedEventData);
                            continue;
                        }

                        // Convert bigint values to ethers.BigNumber for comparison
                        const kpiTypeIdFromEvent = ethers.BigNumber.from(parsedEventData.kpiTypeId);
                        const reportingYearFromEvent = ethers.BigNumber.from(parsedEventData.reportingYear);
                        const valueFromEvent = ethers.BigNumber.from(parsedEventData.value);
                        const metadataCidFromEvent = parsedEventData.metadataCid;

                        // --- DETAILED COMPARISON LOGGING ---
                        console.log("--- Detailed Event Parameter Comparison ---");
                        // 1. kpiOwner comparison - FIXED
                        // Expected address, padded with zeros to 32 bytes, for comparison with topic
                        const expectedOwnerTopic = ethers.utils.hexZeroPad(ownerAddress.toLowerCase(), 32).toLowerCase();
                        const receivedKpiOwnerTopic = parsedEventData.kpiOwner.toLowerCase();
                        const ownerMatch = receivedKpiOwnerTopic === expectedOwnerTopic;
                        console.log(`kpiOwner: Expected (topic): ${expectedOwnerTopic}, Received (topic): ${receivedKpiOwnerTopic}, Match: ${ownerMatch}`);

                        // 2. kpiTypeId comparison
                        const kpiTypeMatch = kpiTypeIdFromEvent.eq(expectedKpiTypeId);
                        console.log(`kpiTypeId: Expected: ${expectedKpiTypeId.toString()}, Received: ${kpiTypeIdFromEvent.toString()}, Match: ${kpiTypeMatch}`);

                        // 3. reportingYear comparison
                        const yearMatch = reportingYearFromEvent.eq(expectedReportingYear);
                        console.log(`reportingYear: Expected: ${expectedReportingYear.toString()}, Received: ${reportingYearFromEvent.toString()}, Match: ${yearMatch}`);

                        // 4. value comparison
                        const valueMatch = valueFromEvent.eq(expectedValue);
                        console.log(`value: Expected: ${expectedValue.toString()}, Received: ${valueFromEvent.toString()}, Match: ${valueMatch}`);

                        // 5. metadataCid comparison
                        const cidMatch = metadataCidFromEvent.toLowerCase() === expectedMetadataCid.toLowerCase();
                        console.log(`metadataCid: Expected: ${expectedMetadataCid.toLowerCase()}, Received: ${metadataCidFromEvent.toLowerCase()}, Match: ${cidMatch}`);
                        console.log("---------------------------------------");

                        if (
                            ownerMatch &&
                            kpiTypeMatch &&
                            yearMatch &&
                            valueMatch &&
                            cidMatch
                        ) {
                            console.log("MATCHING KpiVersionSubmitted event received:", parsedEventData);
                            cleanup();
                            resolve(parsedEventData);
                            return;
                        } else {
                            console.log("Event does not match expected parameters.");
                        }
                    }
                },
                onError: (error) => {
                    console.error("Error watching KpiVersionSubmitted events:", error);
                    cleanup();
                    reject(error);
                }
            });
        });
    }, [contract, contractInterface, kpiVersionSubmittedEventAbiFragment]); // Dependencies for useCallback

    return waitForMatchingEvent;
}

/**
 * Hook for submitting KPI data to the contract.
 * Encapsulates transaction submission logic and event confirmation waiting.
 */
function useKpiSubmission(contract: ThirdwebContract<typeof esgRegistryABI> | undefined, userAddress: string | null) {
    const { mutateAsync: sendTransactionMutation, isPending: isSendingTransaction } = useSendTransaction();
    const waitForMatchingEvent = useKpiEventWatcher(contract);

    const submitKpiData = useCallback(async (
        kpiId: string,
        reportingYear: number,
        currentValue: number, // Original numeric value
        priorValue: number // Original numeric value
    ) => {
        if (!userAddress) {
            throw new Error("Wallet must be connected.");
        }
        if (!contract) {
            throw new Error("Contract not initialized.");
        }

        const txPayloads: { prepared: PreparedTransaction; kpiTypeId: ethers.BigNumber; reportingYear: ethers.BigNumber; value: ethers.BigNumber; metadataCid: Hex }[] = [];
        const numericKpiTypeId = kpiIdToNumericIdMap[kpiId];
        const defaultMetadataCid: Hex = "0x0000000000000000000000000000000000000000000000000000000000000000";

        // Add transaction for the current year
        if (!isNaN(currentValue)) {
            const valueBN = ethers.BigNumber.from(Math.round(currentValue));
            const kpiTypeIdBN = ethers.BigNumber.from(numericKpiTypeId);
            const reportingYearBN = ethers.BigNumber.from(reportingYear);

            txPayloads.push({
                prepared: prepareContractCall({
                    contract,
                    method: "submitKpiVersion",
                    params: [kpiTypeIdBN, reportingYearBN, valueBN, defaultMetadataCid]
                }),
                kpiTypeId: kpiTypeIdBN,
                reportingYear: reportingYearBN,
                value: valueBN,
                metadataCid: defaultMetadataCid
            });
        }

        // Add transaction for the prior year
        if (!isNaN(priorValue)) {
            const valueBN = ethers.BigNumber.from(Math.round(priorValue));
            const kpiTypeIdBN = ethers.BigNumber.from(numericKpiTypeId);
            const reportingYearBN = ethers.BigNumber.from(reportingYear - 1);

            txPayloads.push({
                prepared: prepareContractCall({
                    contract,
                    method: "submitKpiVersion",
                    params: [kpiTypeIdBN, reportingYearBN, valueBN, defaultMetadataCid]
                }),
                kpiTypeId: kpiTypeIdBN,
                reportingYear: reportingYearBN,
                value: valueBN,
                metadataCid: defaultMetadataCid
            });
        }

        if (txPayloads.length === 0) {
            throw new Error("No data to send.");
        }

        const results: KpiVersionSubmittedEventData[] = [];
        for (let i = 0; i < txPayloads.length; i++) {
            const payload = txPayloads[i];
            console.log(`Prepared transaction payload ${i + 1}:`, {
                kpiTypeId: payload.kpiTypeId.toString(),
                reportingYear: payload.reportingYear.toString(),
                value: payload.value.toString(),
                metadataCid: payload.metadataCid
            });

            try {
                const txResult: TransactionReceipt = await sendTransactionMutation(payload.prepared);
                console.log(`Transaction ${i + 1} sent. Hash: ${txResult.transactionHash}. Awaiting event confirmation...`);

                const confirmedEvent = await waitForMatchingEvent(
                    userAddress,
                    payload.kpiTypeId,
                    payload.reportingYear,
                    payload.value,
                    payload.metadataCid
                );
                console.log(`Event confirmed for transaction ${i + 1}.`);
                results.push(confirmedEvent);
            } catch (err: any) {
                console.error(`Error sending or confirming transaction event ${i + 1}:`, err);
                throw err; // Re-throw error for higher-level handling
            }
        }
        return results;
    }, [contract, userAddress, sendTransactionMutation, waitForMatchingEvent]); // Dependencies for useCallback

    return { submitKpiData, isSendingTransaction };
}

// --- FORM COMPONENT RENDERING ---
/**
 * Universal KPI category field renderer.
 * Uses the spec object to dynamically create input fields.
 */
function KpiCategoryFormRenderer({
                                     categorySpec,
                                     formDataForCategory,
                                     onFormDataChange,
                                     isSubmitting,
                                     selectedReportingYear,
                                     preloadedCidsOptions
                                 }: {
    categorySpec: any;
    formDataForCategory: any;
    onFormDataChange: (categoryInternalName: string, fieldKey: string, value: string) => void;
    isSubmitting: boolean;
    selectedReportingYear: number;
    preloadedCidsOptions: { label: string; cid: Hex }[];
}) {
    const handleInputChange = (kpiId: string, fieldType: string, value: string) => {
        onFormDataChange(categorySpec.internalName, `${kpiId}_${fieldType}`, value);
    };

    return (
        <div className="w-full max-w-lg flex flex-col gap-6 p-4 bg-white/5 rounded-lg shadow-md">
            {categorySpec.fields.map((kpi: any) => (
                <div key={kpi.kpiId} className="flex flex-col gap-3 p-3 border border-zinc-700 rounded-md">
                    <label className="block text-md font-semibold text-zinc-200 text-left">{kpi.label}</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                            type="number"
                            step="any"
                            placeholder={`Current Year (${selectedReportingYear}) (${kpi.unit})`}
                            value={formDataForCategory[`${kpi.kpiId}_current`] || ""}
                            onChange={(e) => handleInputChange(kpi.kpiId, 'current', e.target.value)}
                            className="w-full flex-grow border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            data-tooltip-id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-current`}
                            disabled={isSubmitting}
                        />
                        <Tooltip id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-current`} content={kpi.tooltipCurrent || `Enter ${kpi.label} for the current year (${selectedReportingYear}).`} />

                        <input
                            type="number"
                            step="any"
                            placeholder={`Prior Year (${selectedReportingYear - 1}) (${kpi.unit})`}
                            value={formDataForCategory[`${kpi.kpiId}_prior`] || ""}
                            onChange={(e) => handleInputChange(kpi.kpiId, 'prior', e.target.value)}
                            className="w-full flex-grow border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            data-tooltip-id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-prior`}
                            disabled={isSubmitting}
                        />
                        <Tooltip id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-prior`} content={kpi.tooltipPrior || `Enter ${kpi.label} for the prior year (${selectedReportingYear - 1}).`} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- MAIN PAGE COMPONENT ---
export default function ForCompaniesPage() {
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [selectedReportingYear, setSelectedReportingYear] = useState<number>(new Date().getFullYear());

    // Contract initialization via hook
    const contract = useEsgContract();

    // Updated initial form state: only for GHGEmissionsScopeOneAndTwoTotal
    const initialGhGFormData = {
        GHGEmissionsScopeOneAndTwoTotal_current: "",
        GHGEmissionsScopeOneAndTwoTotal_prior: "",
    };
    const [formData, setFormData] = useState<{ ghgEmission: typeof initialGhGFormData }>({
        ghgEmission: { ...initialGhGFormData },
    });
    const [submitting, setSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState("");

    // Hook for submitting KPI data
    const { submitKpiData, isSendingTransaction } = useKpiSubmission(contract, userAddress);

    // Category structure: only one KPI for focus
    const categories = [
        {
            name: 'GHG Emission', internalName: 'ghgEmission',
            fields: [
                { kpiId: 'GHGEmissionsScopeOneAndTwoTotal', label: 'GHG Emissions Scope 1 & 2 (Total)', unit: 'tCO2e', tooltipCurrent: 'e.g., 5000.75 tCO2e.', tooltipPrior: 'e.g., 5200.50 tCO2e.' },
            ],
            additionalFields: [] // Additional fields removed for PoC
        }
    ];

    const currentCategorySpec = categories[0];

    // Form submission handler
    const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();
        setSubmissionStatus("");

        if (!userAddress) {
            setSubmissionStatus("Error: Please connect your wallet to submit data.");
            return;
        }
        if (!selectedReportingYear || selectedReportingYear < 1900 || selectedReportingYear > 2200) {
            setSubmissionStatus("Error: Please enter a valid reporting year.");
            return;
        }
        if (!contract) {
            setSubmissionStatus("Error: Contract not loaded or initialized. Please wait.");
            return;
        }

        setSubmitting(true);
        setSubmissionStatus("Preparing data for submission...");

        try {
            const kpiKey = currentCategorySpec.fields[0].kpiId; // In our case, only one KPI
            const currentValStr = formData.ghgEmission[`${kpiKey}_current`];
            const priorValStr = formData.ghgEmission[`${kpiKey}_prior`];

            const currentVal = parseFloat(currentValStr);
            const priorVal = parseFloat(priorValStr);

            if (isNaN(currentVal) && isNaN(priorVal)) {
                setSubmissionStatus("No data entered for submission.");
                setSubmitting(false);
                return;
            }

            // Call the hook to submit data
            await submitKpiData(kpiKey, selectedReportingYear, currentVal, priorVal);

            setSubmissionStatus(`Data for ${currentCategorySpec.name} successfully submitted! Form cleared.`);
            setFormData(prevData => ({
                ...prevData,
                [currentCategorySpec.internalName]: { ...initialGhGFormData }
            }));

        } catch (err: any) {
            console.error("Error during data submission:", err);
            let finalErrorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred during submission.';
            setSubmissionStatus(`Error: ${finalErrorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Update user address when active account changes
    const account = useActiveAccount();
    useEffect(() => {
        if (account && account.address) {
            setUserAddress(account.address);
        } else {
            setUserAddress(null);
        }
    }, [account]);

    // Update form data
    const handleGenericFormDataChange = (categoryInternalName: string, fieldKey: string, value: string) => {
        setFormData(prevData => ({
            ...prevData,
            [categoryInternalName]: {
                ...(prevData[categoryInternalName as keyof typeof prevData] || {}),
                [fieldKey]: value
            }
        }));
    };

    return (
        <div className="relative p-4 pb-20 min-h-screen w-full mx-auto bg-gradient-to-br from-gray-900 to-blue-900 text-zinc-100 flex flex-col items-center justify-center">
            <div className="fixed top-6 left-6 z-50">
                <a href="/" className="inline-block transform hover:scale-110 transition-transform duration-300">
                    <Image
                        src={logoIcon}
                        alt="Home"
                        width={50}
                        height={50}
                        style={{ filter: "drop-shadow(0px 0px 18px #88a2ff6e)" }}
                    />
                </a>
            </div>
            <div className="fixed top-6 right-6 z-50">
                <ConnectButton client={client} appMetadata={{ name: "FieldFlow - ESG KPI Reporting", url: "https://esg.fieldflow.lu" }} />
            </div>

            <main className="w-full max-w-2xl p-6 md:p-10 bg-white/10 backdrop-blur-md shadow-2xl rounded-xl mt-24 mb-10">
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                        Company ESG Data Submission
                    </h1>
                    {userAddress ? (
                        <p className="text-zinc-300 text-sm mb-8">
                            Connected Address: <span className="font-mono bg-white/20 px-2 py-1 rounded text-xs">{userAddress}</span>
                        </p>
                    ) : (
                        <p className="text-yellow-400 text-sm mb-8">Please connect your wallet to submit data.</p>
                    )}

                    {currentCategorySpec ? (
                        <>
                            <div className="mb-6">
                                <label htmlFor="reportingYearInput" className="block text-md font-semibold text-zinc-200 mb-2">
                                    Select Reporting Year (Current):
                                </label>
                                <input
                                    type="number"
                                    id="reportingYearInput"
                                    value={selectedReportingYear}
                                    onChange={(e) => {
                                        const year = parseInt(e.target.value, 10);
                                        if (!isNaN(year)) {
                                            setSelectedReportingYear(year);
                                        } else if (e.target.value === "") {
                                            setSelectedReportingYear(new Date().getFullYear());
                                        }
                                    }}
                                    className="w-full max-w-xs mx-auto border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                                    placeholder="YYYY"
                                    min="1900"
                                    max="2200"
                                    disabled={submitting || isSendingTransaction}
                                />
                                <h2 className="text-2xl font-semibold mb-1">{currentCategorySpec.name}</h2>
                            </div>
                            <div className="flex flex-col items-center gap-6">
                                <KpiCategoryFormRenderer
                                    categorySpec={currentCategorySpec}
                                    formDataForCategory={formData[currentCategorySpec.internalName as keyof typeof formData] || {}}
                                    onFormDataChange={handleGenericFormDataChange}
                                    isSubmitting={submitting || isSendingTransaction}
                                    selectedReportingYear={selectedReportingYear}
                                    preloadedCidsOptions={preloadedCids} // Pass options for dropdown
                                />
                                <div className="w-full flex justify-center mt-6">
                                    <button
                                        onClick={handleSubmit}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                                        disabled={submitting || isSendingTransaction || !currentCategorySpec }
                                    >
                                        {submitting || isSendingTransaction ? "Submitting..." : "Submit GHG Emissions Data"}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="mt-8">
                            <p className="text-yellow-400 text-lg font-semibold">
                                No KPI category selected or available at the moment.
                            </p>
                        </div>
                    )}
                    {submissionStatus && (
                        <p className={`mt-6 text-sm ${submissionStatus.startsWith("Error:") || submissionStatus.startsWith("Submission Error:") ? "text-red-400" : "text-green-400"}`}>
                            {submissionStatus}
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
