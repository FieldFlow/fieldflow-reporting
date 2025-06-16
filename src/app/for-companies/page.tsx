"use client";

import { defineChain, getContract, prepareContractCall, ThirdwebContract, PreparedTransaction, TransactionReceipt, watchContractEvents, Hex, AbiEvent } from "thirdweb";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg";
import { Tooltip } from "react-tooltip";

// Импортируем JSON-файл ABI контракта
import { abi as esgRegistryABI } from '../../../public/VersionedPersonalESGRegistry.json';
// Корректный импорт клиента Thirdweb
import { client } from "@/app/client";

// --- КОНФИГУРАЦИЯ КОНТРАКТА ---
const CONTRACT_ADDRESS = "0xA0a3b1BAAab579795d31f379bC7Cf32dC8e10eF8";
const CHAIN_ID = 44787; // Celo Alfajores Testnet

// --- MAPPING STRING KPI IDs TO NUMERIC FOR THE CONTRACT ---
// Используем полные, читаемые идентификаторы для ясности
const kpiIdToNumericIdMap: Record<string, number> = {
    'GHGEmissionsScopeOneAndTwoTotal': 1,
    // Другие KPI можно добавить здесь по мере необходимости
};

// --- Pre-loaded IPFS CIDs for dropdowns (for PoC demonstration) ---
// В реальном приложении эти CIDs будут указывать на реальные файлы в IPFS.
// NOTE: Эти значения являются заглушками. В реальном приложении это будут фактические представления bytes32 IPFS CID.
const preloadedCids: { label: string; cid: Hex }[] = []; // В текущей форме нет полей, использующих preloadedCids

// --- ТИПЫ ДАННЫХ ---
// Тип для данных события KpiVersionSubmitted
type KpiVersionSubmittedEventData = {
    kpiOwner: Hex;
    kpiTypeId: bigint;
    reportingYear: bigint;
    value: bigint;
    metadataCid: Hex;
    submissionTimestamp: bigint;
    version: bigint;
};

// --- КАСТОМНЫЕ ХУКИ ---

/**
 * Хук для инициализации и получения экземпляра контракта Thirdweb.
 * @returns {ThirdwebContract<typeof esgRegistryABI> | undefined} Экземпляр контракта или undefined, если клиент не готов.
 */
function useEsgContract() {
    const [contract, setContract] = useState<ThirdwebContract<typeof esgRegistryABI>>();

    useEffect(() => {
        // Убедимся, что клиент импортирован и доступен
        if (client) {
            const esgContract = getContract({
                client,
                chain: defineChain(CHAIN_ID),
                address: CONTRACT_ADDRESS,
                abi: esgRegistryABI,
            }) as ThirdwebContract<typeof esgRegistryABI>;
            setContract(esgContract);
        }
    }, []); // Зависимости отсутствуют, выполняется один раз при монтировании

    return contract;
}

/**
 * Хук для отслеживания и декодирования событий KpiVersionSubmitted.
 * @returns {(ownerAddress: string, expectedKpiTypeId: ethers.BigNumber, expectedReportingYear: ethers.BigNumber, expectedValue: ethers.BigNumber, expectedMetadataCid: Hex) => Promise<KpiVersionSubmittedEventData>} Функция для ожидания совпадения события.
 */
function useKpiEventWatcher(contract: ThirdwebContract<typeof esgRegistryABI> | undefined) {
    // Создаем ethers.Interface из ABI для ручного декодирования логов
    const contractInterface = new ethers.utils.Interface(esgRegistryABI);

    // Находим фрагмент события KpiVersionSubmitted в ABI
    const kpiVersionSubmittedEventAbiFragment = esgRegistryABI.find(
        (item: any) => item.type === "event" && item.name === "KpiVersionSubmitted"
    ) as AbiEvent | undefined;

    const waitForMatchingEvent = useCallback((
        ownerAddress: string,
        expectedKpiTypeId: ethers.BigNumber,
        expectedReportingYear: ethers.BigNumber,
        expectedValue: ethers.BigNumber,
        expectedMetadataCid: Hex,
        timeoutMs: number = 90000 // Таймаут по умолчанию 90 секунд
    ): Promise<KpiVersionSubmittedEventData> => {
        return new Promise((resolve, reject) => {
            if (!contract) {
                return reject(new Error("Контракт не инициализирован. Невозможно отслеживать события."));
            }
            if (!kpiVersionSubmittedEventAbiFragment) {
                return reject(new Error("Определение события KpiVersionSubmitted не найдено в ABI."));
            }

            let unwatch: (() => void) | undefined;
            let timeoutId: NodeJS.Timeout | undefined;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (unwatch) {
                    console.log("Остановка наблюдателя событий по совпадению или таймауту.");
                    unwatch();
                }
            };

            timeoutId = setTimeout(() => {
                console.warn(`Таймаут (${timeoutMs / 1000}с) ожидания события KpiVersionSubmitted. Ожидалось: KPI Type ID: ${expectedKpiTypeId.toString()}, Год: ${expectedReportingYear.toString()}, Значение: ${expectedValue.toString()}`);
                cleanup();
                reject(new Error(`Таймаут (${timeoutMs / 1000}с) ожидания события KpiVersionSubmitted для KPI Type ID: ${expectedKpiTypeId.toString()}, Год: ${expectedReportingYear.toString()}`));
            }, timeoutMs);

            console.log(`Начинаем отслеживание события KpiVersionSubmitted. Владелец: ${ownerAddress}, Тип KPI: ${expectedKpiTypeId.toString()}, Год: ${expectedReportingYear.toString()}, Значение: ${expectedValue.toString()}, CID метаданных: ${expectedMetadataCid}`);

            unwatch = watchContractEvents({
                contract: contract,
                events: [kpiVersionSubmittedEventAbiFragment],
                onEvents: (events) => {
                    console.log(`Наблюдатель событий получил ${events.length} событие(й).`);
                    for (const event of events) {
                        console.log("Получен полный объект события:", event);

                        let parsedEventData: KpiVersionSubmittedEventData | undefined;
                        let kpiOwnerTopic: Hex | undefined;
                        let reportingYearTopic: Hex | undefined;
                        let metadataCidTopic: Hex | undefined;

                        try {
                            const eventFragment = contractInterface.getEvent("KpiVersionSubmitted");
                            if (!eventFragment) {
                                throw new Error("Не удалось найти фрагмент события для KpiVersionSubmitted.");
                            }

                            const nonIndexedInputs = eventFragment.inputs.filter(input => !input.indexed);
                            const nonIndexedTypes = nonIndexedInputs.map(input => input.type);

                            const decodedData = ethers.utils.defaultAbiCoder.decode(
                                nonIndexedTypes,
                                event.data
                            );

                            // Индексированные параметры берутся из topics
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

                            console.log("Данные события декодированы вручную с использованием defaultAbiCoder:", parsedEventData);
                        } catch (parseError) {
                            console.error("Ошибка при ручном декодировании лога события:", parseError, event);
                            continue;
                        }

                        // Проверяем, что parsedEventData валиден и содержит необходимые свойства
                        if (!parsedEventData || parsedEventData.kpiOwner === undefined || parsedEventData.kpiTypeId === undefined || parsedEventData.reportingYear === undefined || parsedEventData.value === undefined || parsedEventData.metadataCid === undefined) {
                            console.warn("Разобранные данные события неполные или пустые, пропускаем проверку совпадения:", parsedEventData);
                            continue;
                        }

                        // Конвертируем значения bigint в ethers.BigNumber для сравнения
                        const kpiTypeIdFromEvent = ethers.BigNumber.from(parsedEventData.kpiTypeId);
                        const reportingYearFromEvent = ethers.BigNumber.from(parsedEventData.reportingYear);
                        const valueFromEvent = ethers.BigNumber.from(parsedEventData.value);
                        const metadataCidFromEvent = parsedEventData.metadataCid;

                        // --- ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ СРАВНЕНИЙ ---
                        console.log("--- Детальное сравнение параметров события ---");
                        // 1. Сравнение kpiOwner - ИСПРАВЛЕНО
                        // Используем hexStripZeros для получения корректного адреса из 32-байтового топика
                        const receivedKpiOwner = (kpiOwnerTopic ? ethers.utils.getAddress(ethers.utils.hexStripZeros(kpiOwnerTopic)).toLowerCase() : '');
                        const ownerMatch = receivedKpiOwner === ownerAddress.toLowerCase();
                        console.log(`kpiOwner: Ожидалось: ${ownerAddress.toLowerCase()}, Получено: ${receivedKpiOwner}, Совпадение: ${ownerMatch}`);

                        // 2. Сравнение kpiTypeId
                        const kpiTypeMatch = kpiTypeIdFromEvent.eq(expectedKpiTypeId);
                        console.log(`kpiTypeId: Ожидалось: ${expectedKpiTypeId.toString()}, Получено: ${kpiTypeIdFromEvent.toString()}, Совпадение: ${kpiTypeMatch}`);

                        // 3. Сравнение reportingYear
                        const yearMatch = reportingYearFromEvent.eq(expectedReportingYear);
                        console.log(`reportingYear: Ожидалось: ${expectedReportingYear.toString()}, Получено: ${reportingYearFromEvent.toString()}, Совпадение: ${yearMatch}`);

                        // 4. Сравнение value
                        const valueMatch = valueFromEvent.eq(expectedValue);
                        console.log(`value: Ожидалось: ${expectedValue.toString()}, Получено: ${valueFromEvent.toString()}, Совпадение: ${valueMatch}`);

                        // 5. Сравнение metadataCid
                        const cidMatch = metadataCidFromEvent.toLowerCase() === expectedMetadataCid.toLowerCase();
                        console.log(`metadataCid: Ожидалось: ${expectedMetadataCid.toLowerCase()}, Получено: ${metadataCidFromEvent.toLowerCase()}, Совпадение: ${cidMatch}`);
                        console.log("---------------------------------------");

                        if (
                            ownerMatch &&
                            kpiTypeMatch &&
                            yearMatch &&
                            valueMatch &&
                            cidMatch
                        ) {
                            console.log("ПОДХОДЯЩЕЕ событие KpiVersionSubmitted получено:", parsedEventData);
                            cleanup();
                            resolve(parsedEventData);
                            return;
                        } else {
                            console.log("Событие не соответствует ожидаемым параметрам.");
                        }
                    }
                },
                onError: (error) => {
                    console.error("Ошибка при отслеживании событий KpiVersionSubmitted:", error);
                    cleanup();
                    reject(error);
                }
            });
        });
    }, [contract, contractInterface, kpiVersionSubmittedEventAbiFragment]); // Зависимости для useCallback

    return waitForMatchingEvent;
}

/**
 * Хук для отправки KPI данных в контракт.
 * Инкапсулирует логику отправки транзакции и ожидания подтверждения события.
 */
function useKpiSubmission(contract: ThirdwebContract<typeof esgRegistryABI> | undefined, userAddress: string | null) {
    const { mutateAsync: sendTransactionMutation, isPending: isSendingTransaction } = useSendTransaction();
    const waitForMatchingEvent = useKpiEventWatcher(contract);

    const submitKpiData = useCallback(async (
        kpiId: string,
        reportingYear: number,
        currentValue: number, // Оригинальное числовое значение
        priorValue: number // Оригинальное числовое значение
    ) => {
        if (!userAddress) {
            throw new Error("Необходимо подключить кошелек.");
        }
        if (!contract) {
            throw new Error("Контракт не инициализирован.");
        }

        const txPayloads: { prepared: PreparedTransaction; kpiTypeId: ethers.BigNumber; reportingYear: ethers.BigNumber; value: ethers.BigNumber; metadataCid: Hex }[] = [];
        const numericKpiTypeId = kpiIdToNumericIdMap[kpiId];
        const defaultMetadataCid: Hex = "0x0000000000000000000000000000000000000000000000000000000000000000";

        // Добавляем транзакцию для текущего года
        if (!isNaN(currentValue)) {
            const valueBN = ethers.BigNumber.from(Math.round(currentValue * 100)); // Умножаем на 100 для сохранения точности
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

        // Добавляем транзакцию для предыдущего года
        if (!isNaN(priorValue)) {
            const valueBN = ethers.BigNumber.from(Math.round(priorValue * 100)); // Умножаем на 100 для сохранения точности
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
            throw new Error("Нет данных для отправки.");
        }

        const results: KpiVersionSubmittedEventData[] = [];
        for (let i = 0; i < txPayloads.length; i++) {
            const payload = txPayloads[i];
            console.log(`Подготовленный payload транзакции ${i + 1}:`, {
                kpiTypeId: payload.kpiTypeId.toString(),
                reportingYear: payload.reportingYear.toString(),
                value: payload.value.toString(),
                metadataCid: payload.metadataCid
            });

            try {
                const txResult: TransactionReceipt = await sendTransactionMutation(payload.prepared);
                console.log(`Транзакция ${i + 1} отправлена. Хэш: ${txResult.transactionHash}. Ожидаем подтверждения события...`);

                const confirmedEvent = await waitForMatchingEvent(
                    userAddress,
                    payload.kpiTypeId,
                    payload.reportingYear,
                    payload.value,
                    payload.metadataCid
                );
                console.log(`Событие подтверждено для транзакции ${i + 1}.`);
                results.push(confirmedEvent);
            } catch (err: any) {
                console.error(`Ошибка при отправке или подтверждении события транзакции ${i + 1}:`, err);
                throw err; // Перебрасываем ошибку для обработки на верхнем уровне
            }
        }
        return results;
    }, [contract, userAddress, sendTransactionMutation, waitForMatchingEvent]); // Зависимости для useCallback

    return { submitKpiData, isSendingTransaction };
}

// --- РЕНДЕРИНГ КОМПОНЕНТОВ ФОРМЫ ---
/**
 * Универсальный рендерер полей категорий KPI.
 * Использует объект spec для динамического создания полей ввода.
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
        </div>
    );
}

// --- ГЛАВНЫЙ КОМПОНЕНТ СТРАНИЦЫ ---
export default function ForCompaniesPage() {
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [selectedReportingYear, setSelectedReportingYear] = useState<number>(new Date().getFullYear());

    // Инициализация контракта через хук
    const contract = useEsgContract();

    // Обновленное начальное состояние формы: только для GHGEmissionsScopeOneAndTwoTotal
    const initialGhGFormData = {
        GHGEmissionsScopeOneAndTwoTotal_current: "",
        GHGEmissionsScopeOneAndTwoTotal_prior: "",
    };
    const [formData, setFormData] = useState<{ ghgEmission: typeof initialGhGFormData }>({
        ghgEmission: { ...initialGhGFormData },
    });
    const [submitting, setSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState("");

    // Хук для отправки данных KPI
    const { submitKpiData, isSendingTransaction } = useKpiSubmission(contract, userAddress);

    // Структура категорий: только один KPI для фокусировки
    const categories = [
        {
            name: 'GHG Emission', internalName: 'ghgEmission',
            fields: [
                { kpiId: 'GHGEmissionsScopeOneAndTwoTotal', label: 'GHG Emissions Scope 1 & 2 (Total)', unit: 'tCO2e', tooltipCurrent: 'Например, 5000.75 tCO2e.', tooltipPrior: 'Например, 5200.50 tCO2e.' },
            ],
            additionalFields: [] // Удалены дополнительные поля для PoC
        }
    ];

    const currentCategorySpec = categories[0];

    // Обработчик отправки формы
    const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();
        setSubmissionStatus("");

        if (!userAddress) {
            setSubmissionStatus("Ошибка: Пожалуйста, подключите ваш кошелек для отправки данных.");
            return;
        }
        if (!selectedReportingYear || selectedReportingYear < 1900 || selectedReportingYear > 2200) {
            setSubmissionStatus("Ошибка: Пожалуйста, введите действительный отчетный год.");
            return;
        }
        if (!contract) {
            setSubmissionStatus("Ошибка: Контракт не загружен или не инициализирован. Пожалуйста, подождите.");
            return;
        }

        setSubmitting(true);
        setSubmissionStatus("Подготовка данных для отправки...");

        try {
            const kpiKey = currentCategorySpec.fields[0].kpiId; // В нашем случае только один KPI
            const currentValStr = formData.ghgEmission[`${kpiKey}_current`];
            const priorValStr = formData.ghgEmission[`${kpiKey}_prior`];

            const currentVal = parseFloat(currentValStr);
            const priorVal = parseFloat(priorValStr);

            if (isNaN(currentVal) && isNaN(priorVal)) {
                setSubmissionStatus("Нет введенных данных для отправки.");
                setSubmitting(false);
                return;
            }

            // Вызываем хук для отправки данных
            await submitKpiData(kpiKey, selectedReportingYear, currentVal, priorVal);

            setSubmissionStatus(`Данные по ${currentCategorySpec.name} успешно отправлены! Форма очищена.`);
            setFormData(prevData => ({
                ...prevData,
                [currentCategorySpec.internalName]: { ...initialGhGFormData }
            }));

        } catch (err: any) {
            console.error("Ошибка в процессе отправки данных:", err);
            let finalErrorMessage = (err instanceof Error) ? err.message : 'Произошла неизвестная ошибка при отправке.';
            setSubmissionStatus(`Ошибка: ${finalErrorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Обновляем адрес пользователя при изменении активного аккаунта
    const account = useActiveAccount();
    useEffect(() => {
        if (account && account.address) {
            setUserAddress(account.address);
        } else {
            setUserAddress(null);
        }
    }, [account]);

    // Обновляем данные формы
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
                        <p className={`mt-6 text-sm ${submissionStatus.startsWith("Ошибка:") || submissionStatus.startsWith("Submission Error:") ? "text-red-400" : "text-green-400"}`}>
                            {submissionStatus}
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
