"use client";

import {defineChain, getContract} from "thirdweb";
import {ConnectButton, useReadContract} from "thirdweb/react";
import {useState, useEffect} from "react";
import {client} from "../client";
import {ethers} from "ethers";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg";

// connect to your contract
const contract = getContract({
    client,
    chain: defineChain(128123),
    address: "0x33c06A3610D58df2D6c3A8F24063b9b4DEEdB283"
});

// @ts-ignore
const isNumber = value => {
    return typeof value === 'number' && isFinite(value);
}

// Utility function to convert string to uint256
// @ts-ignore
const stringToUint256 = (str) => {
    return ethers.BigNumber.from(ethers.utils.formatBytes32String(str)).toString();
};

// Utility function to convert uint256 back to string
// @ts-ignore
const uint256ToString = (uint256) => {
    try {
        const hexString = ethers.BigNumber.from(uint256).toHexString();
        return ethers.utils.parseBytes32String(hexString);
    } catch (err) {
        const probablyNumber = ethers.BigNumber.from(uint256).toNumber()
        console.debug("probablyNumber", probablyNumber)
        if (isNumber(probablyNumber)){
            return probablyNumber;
        }
        else{
            console.error('Error converting uint256 to string:', err);
            return "Invalid data";
        }
    }
};

// KPI identifiers mapped to their corresponding strings and uint256 IDs
const kpiIdentifiers = {
    ghgEmissionA11: {
        name: "GHG Emission (A1.1)",
        kpiId: stringToUint256("ghgEmissionA11")
    },
    ghgEmissionA12: {
        name: "GHG Emission (A1.2)",
        kpiId: stringToUint256("ghgEmissionA12")
    },
    ghgEmissionA15: {
        name: "GHG Emission (A1.5)",
        kpiId: stringToUint256("ghgEmissionA15")
    },
    hazardousWasteA13: {
        name: "Hazardous Waste (A1.3)",
        kpiId: stringToUint256("hazardousWasteA13")
    },
    hazardousWasteA16: {
        name: "Hazardous Waste (A1.6)",
        kpiId: stringToUint256("hazardousWasteA16")
    },
    nonHazardousWasteA14: {
        name: "Non-Hazardous Waste (A1.4)",
        kpiId: stringToUint256("nonHazardousWasteA14")
    },
    nonHazardousWasteA16: {
        name: "Non-Hazardous Waste (A1.6)",
        kpiId: stringToUint256("nonHazardousWasteA16")
    },
    energyConsumptionA21: {
        name: "Energy Consumption (A2.1)",
        kpiId: stringToUint256("energyConsumptionA21")
    },
    energyConsumptionA23: {
        name: "Energy Consumption (A2.3)",
        kpiId: stringToUint256("energyConsumptionA23")
    },
    waterConsumptionA22: {
        name: "Water Consumption (A2.2)",
        kpiId: stringToUint256("waterConsumptionA22")
    },
    waterConsumptionA24: {
        name: "Water Consumption (A2.4)",
        kpiId: stringToUint256("waterConsumptionA24")
    },
    packagingMaterialA25: {
        name: "Packaging Material (A2.5)",
        kpiId: stringToUint256("packagingMaterialA25")
    },
    environmentalImpactA31: {
        name: "Environmental Impact (A3.1)",
        kpiId: stringToUint256("environmentalImpactA31")
    },
    climateImpactA41: {
        name: "Climate Impact (A4.1)",
        kpiId: stringToUint256("climateImpactA41")
    }
};

console.debug(kpiIdentifiers)

// @ts-ignore
function KPIComponent({companyAddress, kpi}) {
    const {data, isLoading, error} = useReadContract({
        contract,
        method: "function getPublicKPI(address company, uint256 kpiId) view returns (uint256)",
        params: [companyAddress, kpi.kpiId]
    });

    if (error) {
        console.error(`Error fetching KPI ${kpi.name}:`, error);
    }

    const decodedValue = data ? uint256ToString(data) : "Data not available";

    return (
        <div className="bg-zinc-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">{kpi.name}</h3>
            <p className="text-2xl font-bold text-blue-500">
                {isLoading ? "Loading..." : error ? `Error: ${error.message}` : decodedValue}
            </p>
        </div>
    );
}

export default function ForInvestors() {
    const [companyAddress, setCompanyAddress] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('company-address') || "";
        }
        return "";
    });
    const [isClient, setIsClient] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const isAddressValid = ethers.utils.isAddress(companyAddress);

    return (
        <div className="relative p-4 pb-10 min-h-[100vh] container max-w-screen-lg mx-auto">
            <div className="fixed top-4 left-4">
                <a href="/" className="inline-block">
                    <Image
                        src={logoIcon}
                        alt="Home"
                        width={50}
                        height={50}
                        style={{filter: "drop-shadow(0px 0px 24px #a726a9a8)"}}
                    />
                </a>
            </div>
            <div className="fixed top-4 right-4">
                <ConnectButton client={client} appMetadata={{
                    name: "FiledFlow - the ESG KPI Reporting System",
                    url: "https://filedflow.lu"
                }}/>
            </div>
            <main className="flex items-center justify-center min-h-full w-full">
                <div className="py-20 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-10 text-zinc-100">
                        For Investors - View ESG Data
                    </h1>
                    <p className="text-zinc-300 text-base mb-6">
                        View key ESG KPIs for companies to make informed investment decisions.
                    </p>
                    <div className="flex flex-col items-center gap-4 mt-10">
                        <input type="text" placeholder="Search by a Company's Wallet Address (e.g., 0x123...456)"
                               value={companyAddress}
                               onChange={(e) => setCompanyAddress(e.target.value)}
                               className="border border-zinc-800 p-2 rounded-lg text-zinc-900 w-full max-w-lg mx-auto"
                               disabled={isFetching}
                        />
                    </div>
                    {isClient && isAddressValid && !isFetching && (
                        <div
                            className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full mt-6 min-h-[200px] text-center">
                            {Object.values(kpiIdentifiers).map((kpi) => (
                                <KPIComponent key={kpi.kpiId} companyAddress={companyAddress} kpi={kpi}/>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
