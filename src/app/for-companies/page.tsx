"use client";

import {defineChain, getContract, prepareContractCall} from "thirdweb";
import {ConnectButton, useActiveAccount, useSendTransaction,} from "thirdweb/react";
import {useState, useEffect} from "react";
import {client} from "../client";
import GHGEmissionForm from "./GHGEmissionForm";
import HazardousWasteForm from "./HazardousWasteForm";
import NonHazardousWasteForm from "./NonHazardousWasteForm";
import PackagingMaterialForm from "./PackagingMaterialForm";
import EnergyConsumptionForm from "./EnergyConsumptionForm";
import WaterConsumptionForm from "./WaterConsumptionForm";
import {ethers} from "ethers";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg";


const contract = getContract({
    client,
    chain: defineChain(128123),
    address: "0x33c06A3610D58df2D6c3A8F24063b9b4DEEdB283"
});

export default function ForCompanies() {
    const [address, setAddress] = useState(null);
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const [formData, setFormData] = useState({
        ghgEmissionA11: "",
        ghgEmissionA12: "",
        ghgEmissionA15: "",
        hazardousWasteA13: "",
        hazardousWasteA16: "",
        nonHazardousWasteA14: "",
        nonHazardousWasteA16: "",
        packagingMaterialA25: "",
        environmentalImpactA31: "",
        climateImpactA41: "",
        waterConsumptionA22: "",
        waterConsumptionA24: "",
        energyConsumptionA21: "",
        energyConsumptionA23: ""
    });
    const [submitting, setSubmitting] = useState(false);

    const categories = [
        {
            name: 'GHG Emission',
            component: GHGEmissionForm,
            kpis: ['ghgEmissionA11', 'ghgEmissionA12', 'ghgEmissionA15']
        },
        {name: 'Hazardous Waste', component: HazardousWasteForm, kpis: ['hazardousWasteA13', 'hazardousWasteA16']},
        {
            name: 'Non-Hazardous Waste',
            component: NonHazardousWasteForm,
            kpis: ['nonHazardousWasteA14', 'nonHazardousWasteA16']
        },
        {
            name: 'Packaging Material',
            component: PackagingMaterialForm,
            kpis: ['packagingMaterialA25', 'environmentalImpactA31', 'climateImpactA41']
        },
        {
            name: 'Water Consumption',
            component: WaterConsumptionForm,
            kpis: ['waterConsumptionA22', 'waterConsumptionA24']
        },
        {
            name: 'Energy Consumption',
            component: EnergyConsumptionForm,
            kpis: ['energyConsumptionA21', 'energyConsumptionA23']
        }
    ];

    const CurrentCategoryForm = categories[currentCategoryIndex]?.component;
    const {mutate: sendTransaction} = useSendTransaction();

    // @ts-ignore
    const stringToUint256 = (str) => {
        return ethers.BigNumber.from(ethers.utils.formatBytes32String(str)).toString();
    };

    // @ts-ignore
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const currentCategory = categories[currentCategoryIndex];
            for (let i = 0; i < currentCategory.kpis.length; i++) {
                const kpi = currentCategory.kpis[i];
                // @ts-ignore
                const value = formData[kpi];
                const kpiId = stringToUint256(kpi);
                console.log(`Preparing to submit KPI: ${kpi}, Value: ${value}, Category Index: ${currentCategoryIndex}, KPI Index: ${i}, KPI ID (string -> uint256): ${kpiId}`);
                if (value) {
                    const encodedValue = isNaN(value) ? stringToUint256(value) : Number(value);
                    const transaction = await prepareContractCall({
                        contract,
                        method: "function addPublicKPI(address company, uint256 kpiId, uint256 value)",
                        // @ts-ignore
                        params: [address, kpiId, BigInt(encodedValue)]
                    });
                    console.log(`Transaction prepared: ${JSON.stringify(transaction)}`);
                    await new Promise((resolve, reject) => {
                        sendTransaction(transaction, {
                            onSuccess: () => {
                                console.log(`Transaction successful for KPI: ${kpi}`);
                                // @ts-ignore
                                resolve();
                            },
                            onError: (err) => {
                                console.error(`Transaction failed for KPI: ${kpi}`, err);
                                reject(err);
                            }
                        });
                    });
                }
            }
            setCurrentCategoryIndex((prevIndex) => prevIndex + 1);
        } catch (err) {
            console.error("Error preparing KPI data transaction: ", err);
        } finally {
            setSubmitting(false);
        }
    };

    const account = useActiveAccount();

    useEffect(() => {
        if (account && account.address) { // @ts-ignore
            setAddress(account.address)
        }
    }, [account]);

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
                <ConnectButton client={client} appMetadata={{ name: "FiledFlow - the ESG KPI Reporting System", url: "https://filedflow.lu" }}/>
            </div>
            <main className="flex items-center justify-center min-h-full">
                <div className="py-20 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-10 text-zinc-100">
                        For Companies - Submit ESG Data
                    </h1>
                    <p className="text-zinc-300 text-base mb-6">Submit your ESG data to comply with reporting standards
                        from address: {address}.</p>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-100">{categories[currentCategoryIndex]?.name}</h2>
                    <div className="flex flex-col items-center gap-4 mt-10">
                        {CurrentCategoryForm && // @ts-ignore
                            (<CurrentCategoryForm
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleSubmit={handleSubmit}
                                    submitting={submitting}
                                />
                            )}
                        {(!submitting && currentCategoryIndex === categories.length) && (
                            <p className="text-green-500 mt-4">
                                Thanks for submitting!{' '}
                                <a href={`/for-investors?company-address=${address}`}
                                   className="text-blue-500 underline">
                                    Go to investor page
                                </a>
                            </p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
