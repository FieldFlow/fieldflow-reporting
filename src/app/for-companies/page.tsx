"use client";

import { defineChain, getContract, prepareContractCall, ThirdwebContract } from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction, useWaitForTransactionReceipt } from "thirdweb/react";
import { useState, useEffect, useCallback } from "react";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg"; // Убедитесь, что путь верный

// --- КОНФИГУРАЦИЯ ---
import { client } from "@/app/client"; // Убедитесь, что путь верный
import VPERegistry from '../../../public/VersionedPersonalESGRegistry.json'; // Убедитесь, что путь верный
const esgRegistryABI = VPERegistry.abi;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT;
const CHAIN_ID = 44787; // Celo Alfajores Testnet
const KPI_ID_NUMERIC = 1; // Упрощено: ID для 'GHGEmissionsScopeOneAndTwoTotal'

/**
 * Основной компонент страницы
 */
export default function ForCompaniesPage() {
    const account = useActiveAccount();
    const userAddress = account?.address ?? null;

    const [contract, setContract] = useState<ThirdwebContract | undefined>();
    const [selectedReportingYear, setSelectedReportingYear] = useState<number>(new Date().getFullYear());
    const [kpiValue, setKpiValue] = useState<string>("");

    const [status, setStatus] = useState({ message: "", isError: false, txHash: "" });

    // Хук для отправки транзакции от Thirdweb
    const { mutateAsync: sendTransaction, isPending: isSubmitting } = useSendTransaction();

    // --- 1. Инициализация контракта ---
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
                console.error("Не удалось инициализировать контракт:", error);
                setStatus({ message: "Ошибка инициализации контракта.", isError: true, txHash: "" });
            }
        }
    }, []);

    // --- 2. Функция отправки данных ---
    const handleSubmit = async () => {
        // Проверки перед отправкой
        if (!userAddress || !contract) {
            setStatus({ message: "Кошелек не подключен или контракт не готов.", isError: true, txHash: "" });
            return;
        }
        const numericValue = parseFloat(kpiValue);
        if (isNaN(numericValue) || kpiValue.trim() === "") {
            setStatus({ message: "Введите корректное числовое значение KPI.", isError: true, txHash: "" });
            return;
        }

        setStatus({ message: "Подготовка транзакции...", isError: false, txHash: "" });

        try {
            // Параметры для вызова функции контракта
            const valueBigInt = BigInt(Math.round(numericValue));
            const reportingYearBigInt = BigInt(selectedReportingYear);
            const kpiTypeIdBigInt = BigInt(KPI_ID_NUMERIC);
            // Это пустой CID, как и было в вашем коде
            const defaultMetadataCid = "0x0000000000000000000000000000000000000000000000000000000000000000";

            // Готовим вызов контракта
            const preparedTx = prepareContractCall({
                contract,
                method: "submitKpiVersion",
                params: [kpiTypeIdBigInt, reportingYearBigInt, valueBigInt, defaultMetadataCid]
            });

            // Отправляем транзакцию через хук
            setStatus({ message: "Пожалуйста, подтвердите транзакцию в вашем кошельке...", isError: false, txHash: "" });

            const transactionResult = await sendTransaction(preparedTx);

            // --- 3. Ждем подтверждения ---
            // Все, что нам нужно - это дождаться, когда транзакция попадет в блок.
            // хук useSendTransaction уже делает это за нас. Когда await завершился, транзакция в сети.

            console.log("Результат транзакции:", transactionResult);
            setStatus({
                message: `Успех! Транзакция подтверждена.`,
                isError: false,
                txHash: transactionResult.transactionHash
            });

            setKpiValue(""); // Очищаем поле ввода после успеха

        } catch (err) {
            console.error("Ошибка во время отправки:", err);
            const finalErrorMessage = (err instanceof Error) ? err.message : 'Произошла неизвестная ошибка.';
            setStatus({ message: `Ошибка: ${finalErrorMessage}`, isError: true, txHash: "" });
        }
    };

    return (
        <div className="relative p-4 pb-20 min-h-screen w-full mx-auto bg-gradient-to-br from-gray-900 to-blue-900 text-zinc-100 flex flex-col items-center justify-center">
            <header className="fixed top-6 w-full px-6 flex justify-between items-center z-50">
                <a href="/" className="inline-block transform hover:scale-110 transition-transform duration-300">
                    <Image src={logoIcon} alt="Home" width={50} height={50} priority />
                </a>
                <ConnectButton client={client} appMetadata={{ name: "FieldFlow ESG", url: "https://esg.fieldflow.lu" }} />
            </header>

            <main className="w-full max-w-lg p-6 md:p-10 bg-white/10 backdrop-blur-md shadow-2xl rounded-xl mt-24 mb-10">
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-6">Отправка ESG Данных</h1>
                    {userAddress ? (
                        <p className="text-zinc-300 text-sm mb-8">
                            Подключен: <span className="font-mono bg-white/20 px-2 py-1 rounded text-xs">{userAddress}</span>
                        </p>
                    ) : (
                        <p className="text-yellow-400 text-sm mb-8">Пожалуйста, подключите кошелек.</p>
                    )}

                    <div className="mb-6">
                        <label htmlFor="reportingYearInput" className="block text-md font-semibold mb-2">Отчетный год:</label>
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
                            placeholder={`Значение для ${selectedReportingYear} года`}
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
                            {isSubmitting ? "Отправка..." : "Отправить данные в блокчейн"}
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
                                    Посмотреть транзакцию
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
