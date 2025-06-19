"use client";

import { defineChain, getContract, readContract } from "thirdweb";
import { ConnectButton, useReadContract } from "thirdweb/react";
import { useState, useEffect } from "react";
// Use the same client path as on the for-companies page
import { client } from "@/app/client";
import { ethers } from "ethers";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg";

// Recharts imports
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Import the contract ABI used for data recording
import contractABI from '../abi'; // Ensure the path is correct
const esgRegistryABI = contractABI.abi as any[];

// --- CONTRACT CONFIGURATION ---
// Use environment variable for contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT || "0xA0a3b1BAAab579795d31f379bC7Cf32dC8e10eF8"; // Fallback address if variable not set
const CHAIN_ID = 44787; // Celo Alfajores Testnet

// Connect to the contract with its ABI
const contract = getContract({
    client,
    chain: defineChain(CHAIN_ID),
    address: CONTRACT_ADDRESS,
    abi: esgRegistryABI, // ABI is required for reading
});

// Type for the KpiVersion structure returned by getLatestKpiVersion
type KpiVersion = {
    value: bigint; // uint256 in Solidity is typically represented as bigint in JS for Thirdweb
    submissionTimestamp: bigint;
    metadataCid: string; // bytes32 in Solidity is represented as a hex string
};

// KPI identifiers mapped to their corresponding strings and numeric IDs
// Important: kpiId here must match the numeric IDs used on the ForCompaniesPage
const kpiIdentifiers = {
    ghgEmissionScopeOneAndTwoTotal: {
        name: "GHG Emissions Scope 1 & 2 (Total)",
        kpiId: 1, // Corresponds to 'GHGEmissionsScopeOneAndTwoTotal' in kpiIdToNumericIdMap
        unit: "tCO2e" // Unit of measurement for display
    },
};

// Function to decode KPI value (no longer divided by 100)
// This function handles both BigInt and Number inputs gracefully
const decodeKpiValue = (encodedValue: bigint | number | undefined): string => {
    if (encodedValue === undefined) {
        return "N/A";
    }
    const floatValue = Number(encodedValue); // Converts BigInt to Number if it's BigInt
    return floatValue.toFixed(2); // Always show 2 decimal places for consistency
};

// Function to format metadata CID (display as Hex or "N/A")
const formatMetadataCid = (cid: string | undefined): string => {
    if (!cid || cid === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        return "N/A (No Metadata)";
    }
    return `${cid.substring(0, 8)}...${cid.substring(cid.length - 6)}`; // Abbreviated Hex
};

// Helper function to get a short address
const getShortAddress = (address: string | undefined) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Colors for chart lines (can be expanded)
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#8dd1e1', '#a4de6c'];

// Custom Recharts tooltip component
const CustomTooltip = ({ active, payload, label, kpiUnit }: { active?: boolean; payload?: any[]; label?: number; kpiUnit: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-800 p-3 border border-zinc-700 rounded-lg shadow-lg text-zinc-100 text-sm">
                <p className="font-bold text-base mb-1">Year: {label}</p>
                {payload.map((entry, index) => {
                    const dataKeySuffix = '_value';
                    const companyAddress = entry.dataKey.replace(dataKeySuffix, '');
                    const kpiData = entry.payload;

                    const valueKey = `${companyAddress}_value`;
                    const timestampKey = `${companyAddress}_submissionTimestamp`;
                    const metadataCidKey = `${companyAddress}_metadataCid`;

                    const value = kpiData[valueKey]; // This will now be a Number or undefined
                    const submissionTimestamp = kpiData[timestampKey] ? new Date(Number(kpiData[timestampKey]) * 1000).toLocaleString() : "N/A";
                    const metadataCid = kpiData[metadataCidKey];

                    if (value === undefined) return null;

                    // Pass the value directly to decodeKpiValue, which can now handle Number
                    const decodedValue = decodeKpiValue(value);
                    const metadataCidFormatted = formatMetadataCid(metadataCid);

                    return (
                        <div key={`item-${index}`} className="mb-2 last:mb-0">
                            <p style={{ color: entry.stroke }} className="font-semibold text-base">{getShortAddress(companyAddress)}</p>
                            <p>Value: {decodedValue} {kpiUnit}</p>
                            <p>Updated: {submissionTimestamp}</p>
                            {/*<p>CID: {metadataCidFormatted}</p>*/}
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};


// Component for displaying historical KPI graph for multiple companies
function KpiHistoryGraph({companyAddresses, kpi, currentReportingYear}: {companyAddresses: string[], kpi: typeof kpiIdentifiers.ghgEmissionScopeOneAndTwoTotal, currentReportingYear: number}) {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistoricalData = async () => {
            setLoadingHistory(true);
            setHistoryError(null);
            const dataPointsMap: { [year: number]: { year: number; [key: string]: any; } } = {};

            const currentYear = new Date().getFullYear();
            const startYear = currentYear - 10;
            const yearsToQuery = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);

            const allReadPromises: Promise<any>[] = [];

            companyAddresses.forEach(address => {
                yearsToQuery.forEach(year => {
                    allReadPromises.push(
                        readContract({
                            contract,
                            method: "getLatestKpiVersion",
                            params: [address, kpi.kpiId, year]
                        }).then((data) => {
                            const kpiData: KpiVersion | undefined = data as KpiVersion | undefined;

                            // If all fields are zero (indicating no data), return null
                            if (kpiData && (kpiData.value === 0n && kpiData.submissionTimestamp === 0n && kpiData.metadataCid === "0x0000000000000000000000000000000000000000000000000000000000000000")) {
                                return null;
                            }

                            if (kpiData && kpiData.value !== undefined) {
                                // Convert bigint to Number for Recharts to process correctly.
                                // If the value from the contract is 0n, set it to undefined so Recharts skips it.
                                const chartValue = kpiData.value === 0n ? undefined : Number(kpiData.value);

                                return {
                                    companyAddress: address,
                                    year,
                                    value: chartValue, // This will be undefined if kpiData.value was 0n
                                    submissionTimestamp: kpiData.submissionTimestamp,
                                    metadataCid: kpiData.metadataCid
                                };
                            }
                            return null;
                        }).catch(err => {
                            // If the error explicitly states "No versions found for this KPI", treat as null
                            if (err && typeof err.message === 'string' && err.message.includes("No versions found for this KPI")) {
                                return null;
                            } else {
                                console.error(`Unexpected error fetching data for year ${year} for KPI ${kpi.name} and company ${getShortAddress(address)}:`, err);
                                return null;
                            }
                        })
                    );
                });
            });

            try {
                const allSettledResults = await Promise.allSettled(allReadPromises);
                let foundAnyData = false;
                let minDataYear = currentYear;
                let maxDataYear = startYear;

                allSettledResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value !== null) {
                        const { companyAddress, year, value, submissionTimestamp, metadataCid } = result.value;
                        if (!dataPointsMap[year]) {
                            dataPointsMap[year] = { year: year };
                        }
                        // Only add the value if it's not undefined (i.e., not a 0n value from the contract)
                        if (value !== undefined) {
                            dataPointsMap[year][`${companyAddress}_value`] = value;
                        }
                        dataPointsMap[year][`${companyAddress}_submissionTimestamp`] = submissionTimestamp;
                        dataPointsMap[year][`${companyAddress}_metadataCid`] = metadataCid;
                        // Only mark as 'foundAnyData' if a non-undefined value was added
                        if (value !== undefined) {
                            foundAnyData = true;
                        }

                        if (year < minDataYear) minDataYear = year;
                        if (year > maxDataYear) maxDataYear = year;
                    }
                });

                if (!foundAnyData) {
                    minDataYear = currentYear;
                    maxDataYear = currentYear;
                } else {
                    minDataYear = Math.max(startYear, minDataYear - 1);
                    maxDataYear = Math.min(currentYear, maxDataYear + 1);
                }

                const finalData: any[] = [];
                for (let y = minDataYear; y <= maxDataYear; y++) {
                    finalData.push(dataPointsMap[y] || { year: y });
                }

                setHistoryData(finalData);

            } catch (err: any) {
                setHistoryError(`Error loading KPI history: ${err.message}`);
                console.error("General error loading KPI history:", err);
            } finally {
                setLoadingHistory(false);
            }
        };

        const hasValidAddress = companyAddresses.some(address => ethers.utils.isAddress(address));
        if (hasValidAddress) {
            fetchHistoricalData();
        } else {
            setHistoryData([]);
            setLoadingHistory(false);
        }
    }, [companyAddresses, kpi.kpiId, kpi.name]);

    if (loadingHistory) {
        return <div className="text-center text-zinc-300 mt-6 col-span-full">Loading historical data...</div>;
    }

    if (historyError) {
        return <div className="text-center text-red-400 mt-6 col-span-full">{historyError}</div>;
    }

    const hasAnyValidDataPoint = historyData.some(yearData =>
        Object.keys(yearData).some(key => key !== 'year' && key.endsWith('_value') && yearData[key] !== undefined)
    );

    if (!hasAnyValidDataPoint && companyAddresses.some(address => ethers.utils.isAddress(address))) {
        return <div className="text-center text-zinc-300 mt-6 col-span-full">Historical data not found for the selected KPI or all values are 0 for the selected companies.</div>;
    }

    return (
        <div className="mt-8 p-4 bg-zinc-800 rounded-lg shadow-lg w-full col-span-full">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">&quot;{kpi.name}&quot; History</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={historyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5, }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                    <XAxis dataKey="year" stroke="#a3a3a3" tickFormatter={(tick) => String(tick)} />
                    <YAxis
                        stroke="#a3a3a3"
                        label={{ value: kpi.unit, angle: -90, position: 'insideLeft', fill: '#a3a3a3' }}
                        domain={[0, 'auto']}
                        tickFormatter={(value) => Number(value).toLocaleString()} // Format large numbers
                    />
                    <Tooltip
                        content={<CustomTooltip kpiUnit={kpi.unit} />}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#a3a3a3' }} formatter={(value: string) => getShortAddress(value.replace('_value', ''))} />
                    {companyAddresses.map((address, index) => ethers.utils.isAddress(address) && (
                        <Line
                            key={address}
                            type="monotone"
                            // This option tells Recharts to connect lines over null/undefined data points
                            connectNulls
                            dataKey={`${address}_value`}
                            stroke={COLORS[index % COLORS.length]}
                            activeDot={{ r: 8 }}
                            name={getShortAddress(address)}
                            // Removed the 'formatter' prop as it's not a valid prop for Recharts Line component
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}


export default function ForInvestors() {
    const [companyAddressInput, setCompanyAddressInput] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('company-address') || "0xECBbF4df772a579cC9a18a13e0C849f3d3C1e402, 0xcBf7E1043ca0Aa9a5D9C7d67E53dFd5a7839F872";
        }
        return "0xECBbF4df772a579cC9a18a13e0C849f3d3C1e402, 0xcBf7E1043ca0Aa9a5D9C7d67E53dFd5a7839F872";
    });
    const [companyAddresses, setCompanyAddresses] = useState<string[]>([]);
    const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        const inputParts = companyAddressInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
        const valid = inputParts.filter(addr => ethers.utils.isAddress(addr));
        const invalid = inputParts.filter(addr => !ethers.utils.isAddress(addr) && addr !== '');

        setCompanyAddresses(valid);
        setInvalidAddresses(invalid);
    }, [companyAddressInput]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const hasValidAddresses = companyAddresses.length > 0;

    return (
        <div className="relative p-4 pb-10 min-h-[100vh] w-full bg-gradient-to-br from-gray-900 to-blue-900 text-zinc-100">
            <div className="fixed top-4 left-4 z-10">
                <a href="/" className="inline-block transform hover:scale-110 transition-transform duration-300">
                    <Image
                        src={logoIcon}
                        alt="Home"
                        width={50}
                        height={50}
                        style={{filter: "drop-shadow(0px 0px 18px #88a2ff6e)"}}
                    />
                </a>
            </div>
            <div className="fixed top-4 right-4 z-10">
                <ConnectButton client={client} appMetadata={{
                    name: "FieldFlow - ESG KPI Reporting",
                    url: "https://esg.filedflow.lu"
                }}/>
            </div>
            <main className="flex flex-col items-center justify-start min-h-full w-full py-10">
                <div className="pt-20 pb-10 text-center w-full">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-zinc-100">
                        For Investors - View ESG Data
                    </h1>
                    <p className="text-zinc-300 text-base mb-6">
                        View key company ESG KPIs to make informed investment decisions.
                    </p>
                    <div className="flex flex-col items-center gap-4 mt-8 px-4 w-full">
                        <input type="text"
                               placeholder="0xECBbF4df772a579cC9a18a13e0C849f3d3C1e402, 0xcBf7E1043ca0Aa9a5D9C7d67E53dFd5a7839F872"
                               value={companyAddressInput}
                               onChange={(e) => setCompanyAddressInput(e.target.value)}
                               className="border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-400 w-full max-w-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {invalidAddresses.length > 0 && (
                            <p className="mt-2 text-red-400 text-sm">
                                Invalid addresses: {invalidAddresses.join(', ')}. Please check them.
                            </p>
                        )}
                    </div>
                    {isClient && hasValidAddresses && (
                        <>
                            <KpiHistoryGraph
                                companyAddresses={companyAddresses}
                                kpi={kpiIdentifiers.ghgEmissionScopeOneAndTwoTotal}
                                currentReportingYear={new Date().getFullYear()}
                            />
                        </>
                    )}
                    {isClient && !hasValidAddresses && companyAddressInput.length > 0 && invalidAddresses.length === 0 && (
                        <p className="mt-4 text-red-400 text-sm">Please enter at least one valid wallet address.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
