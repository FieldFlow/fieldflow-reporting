"use client";

import { defineChain, getContract, prepareContractCall, ThirdwebContract, PreparedTransaction, TransactionReceipt, watchContractEvents, Hex, AbiEvent } from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useState, useEffect } from "react";
import { client } from "../client"; // Assuming client is correctly configured
import { ethers } from "ethers"; // For BigNumber, if you prefer it over native bigint in some contexts
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg"; // Make sure this path is correct
import { Tooltip } from "react-tooltip";

// Импортируем JSON-файл ABI контракта
import esgRegistryABIJson from '../../../public/VersionedPersonalESGRegistry.json'; // Убедитесь, что путь правильный

// --- CONTRACT CONFIGURATION ---
// Используем ABI из импортированного JSON
const esgRegistryABI = esgRegistryABIJson.abi;

const contract = getContract({
    client,
    chain: defineChain(44787), // Celo Alfajores Testnet
    address: "0xA0a3b1BAAab579795d31f379bC7Cf32dC8e10eF8", // Updated contract address
    abi: esgRegistryABI, // Используем импортированный ABI
}) as ThirdwebContract<typeof esgRegistryABI>;

// --- MAPPING STRING KPI IDs TO NUMERIC FOR THE CONTRACT ---
// Используем полные, читаемые идентификаторы для ясности
const kpiIdToNumericIdMap: Record<string, number> = {
    // GHG Emission
    'GHGEmissionsScopeOneAndTwoTotal': 1,
    // 'GHGEmissionsScopeOneAndTwoIntensity': 4, // Удалено для упрощения PoC
    // 'GHGEmissionsScopeThreeTotal': 2, // Удалено для упрощения PoC
    // 'GHGEmissionsScopeThreeIntensity': 5, // Удалено для упрощения PoC
    // 'GHGReductionMeasuresAndResults': 3, // Удалено для упрощения PoC
    // 'GHG2030Target': 7, // Удалено для упрощения PoC
    // 'GHGTransitionPlanDescription': 8, // Удалено для упрощения PoC
};

// --- Pre-loaded IPFS CIDs for dropdowns (for PoC demonstration) ---
// В реальном приложении эти CIDs будут указывать на реальные файлы в IPFS.
// Здесь используем placeholder-значения (bytes32 Hex strings) для демонстрации.
// NOTE: These are dummy values. In a real app, these would be actual bytes32 representations of IPFS CIDs.
const preloadedCids = [
    // Убраны все CIDs, так как поле 'GHGTransitionPlanDescription' удалено
];


// --- UNIVERSAL KPI CATEGORY FORM RENDERER ---
// Адаптирован для новых полей и типов ввода
function KpiCategoryFormRenderer({
                                     categorySpec,
                                     formDataForCategory,
                                     onFormDataChange,
                                     isSubmitting,
                                     selectedReportingYear,
                                     preloadedCidsOptions // Добавлен для dropdown
                                 }: {
    categorySpec: any;
    formDataForCategory: any;
    onFormDataChange: (categoryInternalName: string, fieldKey: string, value: string) => void;
    isSubmitting: boolean;
    selectedReportingYear: number;
    preloadedCidsOptions: { label: string; cid: Hex }[]; // Corrected type to Hex
}) {
    const handleInputChange = (kpiId: string, fieldType: string, value: string) => {
        onFormDataChange(categorySpec.internalName, `${kpiId}_${fieldType}`, value);
    };

    // Обновляем handleSelectChange для обработки выпадающего списка
    const handleSelectChange = (kpiId: string, value: string) => {
        onFormDataChange(categorySpec.internalName, kpiId, value); // Value здесь будет строка CID (Hex)
    };


    return (
        <div className="w-full max-w-lg flex flex-col gap-6 p-4 bg-white/5 rounded-lg shadow-md">
            {/* Рендеринг основных числовых полей KPI (Total, Intensity, Reduction) */}
            {categorySpec.fields.map((kpi: any) => (
                <div key={kpi.kpiId} className="flex flex-col gap-3 p-3 border border-zinc-700 rounded-md">
                    <label className="block text-md font-semibold text-zinc-200 text-left">{kpi.label}</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                            type="number"
                            step="any"
                            placeholder={`Текущий год (${selectedReportingYear}) (${kpi.unit})`}
                            value={formDataForCategory[`${kpi.kpiId}_current`] || ""}
                            onChange={(e) => handleInputChange(kpi.kpiId, 'current', e.target.value)}
                            className="w-full flex-grow border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            data-tooltip-id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-current`}
                            disabled={isSubmitting}
                        />
                        <Tooltip id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-current`} content={kpi.tooltipCurrent || `Введите ${kpi.label} для текущего года (${selectedReportingYear}).`} />

                        <input
                            type="number"
                            step="any"
                            placeholder={`Предыдущий год (${selectedReportingYear - 1}) (${kpi.unit})`}
                            value={formDataForCategory[`${kpi.kpiId}_prior`] || ""}
                            onChange={(e) => handleInputChange(kpi.kpiId, 'prior', e.target.value)}
                            className="w-full flex-grow border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            data-tooltip-id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-prior`}
                            disabled={isSubmitting}
                        />
                        <Tooltip id={`tooltip-${categorySpec.internalName}-${kpi.kpiId}-prior`} content={kpi.tooltipPrior || `Введите ${kpi.label} для предыдущего года (${selectedReportingYear - 1}).`} />
                    </div>
                </div>
            ))}

            {/* Рендеринг дополнительных полей (для PoC: Цель 2030, План Перехода) - теперь пусто */}
            {categorySpec.additionalFields && categorySpec.additionalFields.map((field: any) => (
                <div key={field.kpiId} className="w-full">
                    <label htmlFor={`${categorySpec.internalName}_${field.kpiId}`} className="block text-sm font-medium text-zinc-300 mb-1 text-left">
                        {field.label} {field.unit && `(${field.unit})`}
                    </label>
                    {field.type === 'number' && (
                        <input
                            type="number"
                            step="any"
                            id={`${categorySpec.internalName}_${field.kpiId}`}
                            value={formDataForCategory[field.kpiId] || ""}
                            onChange={(e) => onFormDataChange(categorySpec.internalName, field.kpiId, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            data-tooltip-id={`tooltip-${categorySpec.internalName}-${field.kpiId}`}
                            disabled={isSubmitting}
                        />
                    )}
                    {field.type === 'select' && (
                        <select
                            id={`${categorySpec.internalName}_${field.kpiId}`}
                            value={formDataForCategory[field.kpiId] || ""}
                            onChange={(e) => handleSelectChange(field.kpiId, e.target.value)}
                            className="w-full border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            data-tooltip-id={`tooltip-${categorySpec.internalName}-${field.kpiId}`}
                            disabled={isSubmitting}
                        >
                            <option value="" disabled>Выберите план...</option>
                            {preloadedCidsOptions.map(option => (
                                <option key={option.cid} value={option.cid}> {/* Use raw Hex string as value */}
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}
                    <Tooltip id={`tooltip-${categorySpec.internalName}-${field.kpiId}`} content={field.tooltip || field.placeholder} />
                </div>
            ))}
        </div>
    );
}

// Define a type for the event data based on your ABI
// IMPORTANT: Corrected metadataCid type to Hex.
// Using 'bigint' for uint256 types as Thirdweb often returns them as native BigInts.
type KpiVersionSubmittedEventData = {
    kpiOwner: string;
    kpiTypeId: bigint;
    reportingYear: bigint;
    value: bigint;
    metadataCid: Hex;
    submissionTimestamp: bigint;
    version: bigint;
};

// Create an ethers Interface object from the ABI for manual decoding
const contractInterface = new ethers.utils.Interface(esgRegistryABI);

// Find the specific event ABI from the imported JSON ABI
const kpiVersionSubmittedEventAbi = esgRegistryABI.find(
    (item: any) => item.type === "event" && item.name === "KpiVersionSubmitted"
) as AbiEvent | undefined;


export default function ForCompaniesPage() {
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [selectedReportingYear, setSelectedReportingYear] = useState<number>(new Date().getFullYear());

    // Обновленное начальное состояние формы: только для GHGEmissionsScopeOneAndTwoTotal
    const initialGhGFormData = {
        GHGEmissionsScopeOneAndTwoTotal_current: "",
        GHGEmissionsScopeOneAndTwoTotal_prior: "",
        // Остальные поля удалены для упрощения тестирования
    };

    const [formData, setFormData] = useState<{ ghgEmission: typeof initialGhGFormData }>({
        ghgEmission: { ...initialGhGFormData },
    });
    const [submitting, setSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState("");

    // Обновленная структура категорий: только один KPI
    const categories = [
        {
            name: 'GHG Emission', internalName: 'ghgEmission',
            fields: [
                { kpiId: 'GHGEmissionsScopeOneAndTwoTotal', label: 'GHG Emissions Scope 1 & 2 (Total)', unit: 'tCO2e', tooltipCurrent: 'Например, 5000.75 tCO2e.', tooltipPrior: 'Например, 5200.50 tCO2e.' },
            ],
            additionalFields: [] // Удалены дополнительные поля
        }
    ];

    const currentCategorySpec = categories[0];
    const { mutateAsync: sendTransactionMutation, isPending: isSendingTransaction } = useSendTransaction();

    // Helper function to wait for a specific event
    const waitForMatchingEvent = (
        ownerAddress: string,
        expectedKpiTypeId: ethers.BigNumber,
        expectedReportingYear: ethers.BigNumber,
        expectedValue: ethers.BigNumber,
        expectedMetadataCid: Hex,
        timeoutMs: number = 90000
    ): Promise<KpiVersionSubmittedEventData> => {
        return new Promise((resolve, reject) => {
            if (!ownerAddress) {
                reject(new Error("Owner address is undefined. Cannot watch for matching event."));
                return;
            }
            if (!kpiVersionSubmittedEventAbi) {
                reject(new Error("KpiVersionSubmitted event definition not found in main ABI. Cannot watch events."));
                return;
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

            console.log(`Starting to watch for KpiVersionSubmitted event. Owner: ${ownerAddress}, KPI Type: ${expectedKpiTypeId.toString()}, Year: ${expectedReportingYear.toString()}, Value: ${expectedValue.toString()}, Metadata CID: ${expectedMetadataCid}`);

            unwatch = watchContractEvents({
                contract: contract,
                events: [kpiVersionSubmittedEventAbi],
                onEvents: (events) => {
                    console.log(`Event watcher received ${events.length} event(s).`);
                    for (const event of events) {
                        // --- Added console.log to inspect the full event object ---
                        console.log("Full event object received:", event);
                        // --- End of added console.log ---

                        let parsedEventData: KpiVersionSubmittedEventData | undefined;

                        try {
                            // Manually parse the event log using ethers.js Interface
                            const log = contractInterface.parseLog(event);
                            // Cast the parsed arguments to the expected type
                            parsedEventData = log.args as unknown as KpiVersionSubmittedEventData;
                            console.log("Manually parsed event data:", parsedEventData);
                        } catch (parseError) {
                            console.error("Error manually parsing event log:", parseError, event);
                            continue; // Skip this event if parsing fails
                        }

                        // Check if parsedEventData is valid and contains necessary properties
                        if (!parsedEventData || !parsedEventData.kpiOwner || parsedEventData.kpiTypeId === undefined || parsedEventData.reportingYear === undefined || parsedEventData.value === undefined || parsedEventData.metadataCid === undefined) {
                            console.warn("Parsed event data is incomplete or empty, skipping match check:", parsedEventData);
                            continue; // Skip this event if data is incomplete
                        }

                        // Now these should have values and types consistent with the ABI
                        // Convert bigint to ethers.BigNumber for comparison if needed
                        const kpiTypeIdFromEvent = typeof parsedEventData.kpiTypeId === 'bigint' ? ethers.BigNumber.from(parsedEventData.kpiTypeId) : (parsedEventData.kpiTypeId as ethers.BigNumber);
                        const reportingYearFromEvent = typeof parsedEventData.reportingYear === 'bigint' ? ethers.BigNumber.from(parsedEventData.reportingYear) : (parsedEventData.reportingYear as ethers.BigNumber);
                        const valueFromEvent = typeof parsedEventData.value === 'bigint' ? ethers.BigNumber.from(parsedEventData.value) : (parsedEventData.value as ethers.BigNumber);
                        const metadataCidFromEvent = parsedEventData.metadataCid; // Hex string

                        // Compare all relevant fields
                        const ownerMatch = parsedEventData.kpiOwner.toLowerCase() === ownerAddress.toLowerCase();
                        const kpiTypeMatch = kpiTypeIdFromEvent.eq(expectedKpiTypeId);
                        const yearMatch = reportingYearFromEvent.eq(expectedReportingYear);
                        const valueMatch = valueFromEvent.eq(expectedValue);
                        // For Hex comparison, ensure both are treated as strings or convert consistently
                        const cidMatch = metadataCidFromEvent.toLowerCase() === expectedMetadataCid.toLowerCase();


                        console.log(
                            `Comparing with expected: Owner: ${ownerMatch}, KPI Type: ${kpiTypeMatch}, Year: ${yearMatch}, Value: ${valueMatch}, CID: ${cidMatch}`
                        );

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
                            console.log("Event did not match expected parameters.");
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
    };


    interface TransactionPayload {
        prepared: PreparedTransaction;
        kpiTypeId: ethers.BigNumber;
        reportingYear: ethers.BigNumber;
        value: ethers.BigNumber;
        metadataCid: Hex;
    }

    const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();
        setSubmissionStatus("");

        if (!userAddress) {
            setSubmissionStatus("Error: Please connect your wallet first to submit data.");
            return;
        }
        if (!selectedReportingYear || selectedReportingYear < 1900 || selectedReportingYear > 2200) {
            setSubmissionStatus("Error: Please enter a valid Reporting Year.");
            return;
        }

        setSubmitting(true);
        setSubmissionStatus("Preparing data for submission...");

        try {
            if (!currentCategorySpec) {
                throw new Error("Current category specification is undefined. Cannot submit.");
            }
            const categoryData = formData[currentCategorySpec.internalName as keyof typeof formData];
            if (!categoryData) {
                throw new Error(`No data found for category: ${currentCategorySpec.name}`);
            }

            const txPayloads: TransactionPayload[] = [];
            const reportingYearForCurrent = selectedReportingYear;
            const reportingYearForPrior = selectedReportingYear - 1;

            // Process numerical KPI fields (Total, Intensity, Reduction Results)
            for (const kpiSpec of currentCategorySpec.fields) {
                const kpiBaseId = kpiSpec.kpiId;
                const numericKpiTypeId = kpiIdToNumericIdMap[kpiBaseId];

                if (numericKpiTypeId === undefined) {
                    console.warn(`Skipping KPI: Numeric ID not found for ${kpiBaseId} in category ${currentCategorySpec.name}`);
                    continue;
                }

                // Default metadata CID to a zero bytes32 Hex string for numerical KPIs
                const defaultMetadataCid: Hex = "0x0000000000000000000000000000000000000000000000000000000000000000";

                const currentValueStr = (categoryData as any)[`${kpiBaseId}_current`];
                const priorValueStr = (categoryData as any)[`${kpiBaseId}_prior`];

                // --- Current Year Value ---
                if (currentValueStr && currentValueStr.trim() !== "") {
                    const parsedCurrentValue = parseFloat(currentValueStr);
                    if (isNaN(parsedCurrentValue)) {
                        console.warn(`Skipping CURRENT KPI ${kpiBaseId} due to non-numeric value: ${currentValueStr}`);
                    } else {
                        // Умножаем на 100 для сохранения точности, так как value в контракте uint256
                        const valueBN = ethers.BigNumber.from(Math.round(parsedCurrentValue * 100));
                        const kpiTypeIdBN = ethers.BigNumber.from(numericKpiTypeId);
                        const reportingYearBN = ethers.BigNumber.from(reportingYearForCurrent);

                        console.log(`Prepared Tx Payload for ${kpiBaseId} (Current):`);
                        console.log(`  kpiTypeId: ${kpiTypeIdBN.toString()}`);
                        console.log(`  reportingYear: ${reportingYearBN.toString()}`);
                        console.log(`  value: ${valueBN.toString()} (original: ${parsedCurrentValue})`);
                        console.log(`  metadataCid: ${defaultMetadataCid}`);

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
                }

                // --- Prior Year Value ---
                if (priorValueStr && priorValueStr.trim() !== "") {
                    const parsedPriorValue = parseFloat(priorValueStr);
                    if (isNaN(parsedPriorValue)) {
                        console.warn(`Skipping PRIOR KPI ${kpiBaseId} due to non-numeric value: ${priorValueStr}`);
                    } else {
                        // Умножаем на 100 для сохранения точности, так как value в контракте uint256
                        const valueBN = ethers.BigNumber.from(Math.round(parsedPriorValue * 100));
                        const kpiTypeIdBN = ethers.BigNumber.from(numericKpiTypeId);
                        const reportingYearBN = ethers.BigNumber.from(reportingYearForPrior);

                        console.log(`Prepared Tx Payload for ${kpiBaseId} (Prior):`);
                        console.log(`  kpiTypeId: ${kpiTypeIdBN.toString()}`);
                        console.log(`  reportingYear: ${reportingYearBN.toString()}`);
                        console.log(`  value: ${valueBN.toString()} (original: ${parsedPriorValue})`);
                        console.log(`  metadataCid: ${defaultMetadataCid}`);

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
                }
            }

            // Process additional fields (GHG2030Target, GHGTransitionPlanDescription) - now empty
            if (currentCategorySpec.additionalFields) {
                for (const fieldSpec of currentCategorySpec.additionalFields) {
                    const kpiBaseId = fieldSpec.kpiId;
                    const numericKpiTypeId = kpiIdToNumericIdMap[kpiBaseId];

                    if (numericKpiTypeId === undefined) {
                        console.warn(`Skipping Additional KPI: Numeric ID not found for ${kpiBaseId}`);
                        continue;
                    }

                    const fieldValue = (categoryData as any)[kpiBaseId];

                    if (fieldSpec.type === 'number' && fieldValue && fieldValue.trim() !== "") {
                        const parsedValue = parseFloat(fieldValue);
                        if (isNaN(parsedValue)) {
                            console.warn(`Skipping Additional KPI ${kpiBaseId} due to non-numeric value: ${fieldValue}`);
                        } else {
                            // Умножаем на 100 для сохранения точности, если это процент или десятичное число
                            const valueBN = ethers.BigNumber.from(Math.round(parsedValue * 100));
                            const kpiTypeIdBN = ethers.BigNumber.from(numericKpiTypeId);
                            const reportingYearBN = ethers.BigNumber.from(reportingYearForCurrent); // Цели обычно для текущего года отчетности

                            // Для числовых целей metadataCid по умолчанию 0 (bytes32 hex string)
                            const metadataCidBN: Hex = "0x0000000000000000000000000000000000000000000000000000000000000000";

                            console.log(`Prepared Tx Payload for Additional KPI (Number) ${kpiBaseId}:`);
                            console.log(`  kpiTypeId: ${kpiTypeIdBN.toString()}`);
                            console.log(`  reportingYear: ${reportingYearBN.toString()}`);
                            console.log(`  value: ${valueBN.toString()} (original: ${parsedValue})`);
                            console.log(`  metadataCid: ${metadataCidBN}`);

                            txPayloads.push({
                                prepared: prepareContractCall({
                                    contract,
                                    method: "submitKpiVersion",
                                    params: [kpiTypeIdBN, reportingYearBN, valueBN, metadataCidBN]
                                }),
                                kpiTypeId: kpiTypeIdBN,
                                reportingYear: reportingYearBN,
                                value: valueBN,
                                metadataCid: metadataCidBN
                            });
                        }
                    } else if (fieldSpec.type === 'select' && fieldValue && fieldValue.trim() !== "") {
                        // Для полей типа 'select' fieldValue будет выбранным CID (Hex string)
                        const selectedCidHex: Hex = fieldValue as Hex;

                        const kpiTypeIdBN = ethers.BigNumber.from(numericKpiTypeId);
                        const reportingYearBN = ethers.BigNumber.from(reportingYearForCurrent);
                        // Value для текстовых/CID-полей может быть 0 или другое номинальное значение
                        const valueBN = ethers.BigNumber.from(0); // Using 0 for the numerical value

                        console.log(`Prepared Tx Payload for Additional KPI (Select) ${kpiBaseId}:`);
                        console.log(`  kpiTypeId: ${kpiTypeIdBN.toString()}`);
                        console.log(`  reportingYear: ${reportingYearBN.toString()}`);
                        console.log(`  value: ${valueBN.toString()}`);
                        console.log(`  metadataCid: ${selectedCidHex}`);

                        txPayloads.push({
                            prepared: prepareContractCall({
                                contract,
                                method: "submitKpiVersion",
                                params: [kpiTypeIdBN, reportingYearBN, valueBN, selectedCidHex]
                            }),
                            kpiTypeId: kpiTypeIdBN,
                            reportingYear: reportingYearBN,
                            value: valueBN,
                            metadataCid: selectedCidHex
                        });
                    }
                }
            }


            if (txPayloads.length === 0) {
                setSubmissionStatus(`No new data entered to submit for ${currentCategorySpec.name}. Please enter KPI values.`);
                setSubmitting(false);
                return;
            }

            setSubmissionStatus(`Submitting ${txPayloads.length} transaction(s) for ${currentCategorySpec.name}...`);

            // This loop needs to await each transaction and its event confirmation
            for (let i = 0; i < txPayloads.length; i++) {
                const payload = txPayloads[i];
                setSubmissionStatus(`Sending transaction ${i + 1} of ${txPayloads.length} for KPI Type: ${payload.kpiTypeId.toString()}, Year: ${payload.reportingYear.toString()}...`);

                const dataString = (typeof payload.prepared.data === 'string')
                    ? payload.prepared.data.substring(0, 74) + '...'
                    : (payload.prepared.data === undefined ? 'undefined' : '[Non-string data]');
                console.log(`Sending transaction ${i + 1}/${txPayloads.length}. To: ${payload.prepared.to}, Data (start): ${dataString}`);

                if (!userAddress) {
                    throw new Error("User address became undefined during submission process.");
                }

                try {
                    const txResult: TransactionReceipt = await sendTransactionMutation(payload.prepared); // AWAIT here
                    console.log(`Transaction ${i + 1} sent. Tx Hash: ${txResult.transactionHash}. Waiting for event confirmation...`);
                    setSubmissionStatus(`Tx ${i + 1} sent (Hash: ${txResult.transactionHash.substring(0,10)}...). Waiting for event...`);

                    await waitForMatchingEvent( // AWAIT here
                        userAddress,
                        payload.kpiTypeId,
                        payload.reportingYear,
                        payload.value,
                        payload.metadataCid
                    );
                    console.log(`Event confirmed for transaction ${i+1}.`);
                    setSubmissionStatus(`Transaction ${i + 1} and event confirmed!`);

                } catch (err: any) {
                    console.error(`Transaction ${i+1} or its event confirmation failed. Error:`, err);
                    let readableError = (err instanceof Error) ? err.message : "Transaction or event confirmation failed.";
                    if (typeof err.message === 'string') {
                        if (err.message.toLowerCase().includes("replacement transaction underpriced")) {
                            readableError = "Transaction failed: Replacement transaction underpriced. This can happen if a previous transaction is still pending or if network gas prices changed. Please check your wallet for pending transactions, wait a few moments, and try again. If the issue persists, try increasing the gas fee in your wallet if possible.";
                        } else if (err.message.toLowerCase().includes("nonce too low")) {
                            readableError = "Transaction failed: Nonce too low. This may indicate an issue with your wallet's transaction sequencing. Please try again, or reset your wallet account if the problem continues (this clears local transaction history, not on-chain data).";
                        } else if (err.message.toLowerCase().includes("timeout")) {
                            readableError = `Event confirmation timed out for transaction ${i+1}. The transaction might have succeeded but the event was not detected in time. Please check a block explorer for TxHash: ${ (err.transactionHash || 'N/A')}.`; // Include TxHash if available in error
                        }
                    } else if (err.data && typeof err.data.message === 'string') {
                        readableError = err.data.message;
                    }
                    if (err.transactionHash) {
                        throw new Error(`${readableError} (TxHash: ${err.transactionHash})`);
                    }
                    throw new Error(readableError);
                }
            }

            setSubmissionStatus(`Data for ${currentCategorySpec.name} submitted successfully! Form has been cleared.`);
            setFormData(prevData => ({
                ...prevData,
                [currentCategorySpec.internalName]: { ...initialGhGFormData }
            }));

        } catch (err: any) {
            console.error("Error during data submission process: ", err);
            let finalErrorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred during submission.';
            setSubmissionStatus(`Error: ${finalErrorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    const account = useActiveAccount();

    useEffect(() => {
        if (account && account.address) {
            setUserAddress(account.address);
        } else {
            setUserAddress(null);
        }
    }, [account]);

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
        <div className="relative p-4 pb-20 min-h-screen container max-w-screen-lg mx-auto bg-gradient-to-br from-gray-900 to-blue-900 text-zinc-100 flex flex-col items-center justify-center">
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
                        Подача данных ESG компанией
                    </h1>
                    {userAddress ? (
                        <p className="text-zinc-300 text-sm mb-8">
                            Подключенный адрес: <span className="font-mono bg-white/20 px-2 py-1 rounded text-xs">{userAddress}</span>
                        </p>
                    ) : (
                        <p className="text-yellow-400 text-sm mb-8">Пожалуйста, подключите ваш кошелек для отправки данных.</p>
                    )}

                    {currentCategorySpec ? (
                        <>
                            <div className="mb-6">
                                <label htmlFor="reportingYearInput" className="block text-md font-semibold text-zinc-200 mb-2">
                                    Выберите Отчетный Год (Текущий):
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
                                    placeholder="ГГГГ"
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
                                    preloadedCidsOptions={preloadedCids} // Передаем опции для выпадающего списка
                                />
                                <div className="w-full flex justify-center mt-6">
                                    <button
                                        onClick={handleSubmit}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                                        disabled={submitting || isSendingTransaction || !currentCategorySpec }
                                    >
                                        {submitting || isSendingTransaction ? "Отправка..." : "Отправить данные по выбросам ПГ"}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="mt-8">
                            <p className="text-yellow-400 text-lg font-semibold">
                                В настоящее время категория KPI не выбрана или недоступна.
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
