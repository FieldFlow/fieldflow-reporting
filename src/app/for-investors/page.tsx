"use client";

import { defineChain, getContract, readContract } from "thirdweb";
import { ConnectButton, useReadContract } from "thirdweb/react";
import { useState, useEffect } from "react";
// Используем тот же путь к client, что и на странице for-companies
import { client } from "@/app/client";
import { ethers } from "ethers";
import Image from 'next/image';
import logoIcon from "../../../public/logo.svg";

// Импорты для Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Импортируем ABI контракта, который использовался для записи данных
import { abi as esgRegistryABI } from '../../../public/VersionedPersonalESGRegistry.json';

// --- КОНФИГУРАЦИЯ КОНТРАКТА ---
// Используем переменную окружения для адреса контракта
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT || "0xA0a3b1BAAab579795d31f379bC7Cf32dC8e10eF8"; // Fallback адрес, если переменная не установлена
const CHAIN_ID = 44787; // Celo Alfajores Testnet

// Подключаемся к контракту с его ABI
const contract = getContract({
    client,
    chain: defineChain(CHAIN_ID),
    address: CONTRACT_ADDRESS,
    abi: esgRegistryABI, // Обязательно указываем ABI для чтения
});

// Тип для структуры KpiVersion, возвращаемой getLatestKpiVersion
type KpiVersion = {
    value: bigint; // uint256 в Solidity обычно отображается как bigint в JS для Thirdweb
    submissionTimestamp: bigint;
    metadataCid: string; // bytes32 в Solidity отображается как hex-строка
};

// KPI identifiers mapped to their corresponding strings and numeric IDs
// Важно: kpiId здесь должен соответствовать числовым ID, используемым на странице ForCompaniesPage
const kpiIdentifiers = {
    ghgEmissionScopeOneAndTwoTotal: {
        name: "GHG Emissions Scope 1 & 2 (Total)",
        kpiId: 1, // Соответствует 'GHGEmissionsScopeOneAndTwoTotal' в kpiIdToNumericIdMap
        unit: "tCO2e" // Единица измерения для отображения
    },
    // Добавьте другие KPI, когда расширите форму отправки:
    // ghgEmissionScopeOneAndTwoIntensity: { name: "GHG Emissions Scope 1 & 2 (Intensity)", kpiId: 4, unit: "tCO2e / млн EUR" },
    // ghgEmissionScopeThreeTotal: { name: "GHG Emissions Scope 3 (Total)", kpiId: 2, unit: "tCO2e" },
    // ghgEmissionScopeThreeIntensity: { name: "GHG Emissions Scope 3 (Intensity)", kpiId: 5, unit: "tCO2e / млн EUR" },
    // ghgReductionMeasuresAndResults: { name: "GHG Reduction Measures & Results", kpiId: 3, unit: "tCO2e reduced" },
    // ghg2030Target: { name: "GHG Reduction Target 2030", kpiId: 7, unit: "%" },
    // ghgTransitionPlanDescription: { name: "GHG Transition Plan (Description)", kpiId: 8, unit: "CID" },
};

// Функция для декодирования значения KPI (больше не делим на 100)
const decodeKpiValue = (encodedValue: bigint | undefined): string => {
    if (encodedValue === undefined) {
        return "N/A";
    }
    // Значение больше не делится на 100, отображается как есть из контракта.
    // Если вы хотите отображать десятичные значения, убедитесь, что они были умножены
    // на соответствующую степень 10 при записи в контракт, и используйте toFixed для форматирования.
    const floatValue = Number(encodedValue);
    return floatValue.toFixed(2); // Всегда показываем 2 знака после запятой для единообразия
};

// Функция для форматирования CID метаданных (отображаем как Hex или "N/A")
const formatMetadataCid = (cid: string | undefined): string => {
    if (!cid || cid === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        return "N/A (Без метаданных)";
    }
    return `${cid.substring(0, 8)}...${cid.substring(cid.length - 6)}`; // Сокращенный Hex
};

// Вспомогательная функция для получения сокращенного адреса
const getShortAddress = (address: string | undefined) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Цвета для линий графика (можно расширить)
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#8dd1e1', '#a4de6c'];

// Пользовательский компонент для тултипа Recharts
const CustomTooltip = ({ active, payload, label, kpiUnit }: { active?: boolean; payload?: any[]; label?: number; kpiUnit: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-800 p-3 border border-zinc-700 rounded-lg shadow-lg text-zinc-100 text-sm">
                <p className="font-bold text-base mb-1">Год: {label}</p>
                {payload.map((entry, index) => {
                    // dataKey для Line - это адрес компании (например, "0xABC_value")
                    const dataKeySuffix = '_value'; // Суффикс для значения
                    const companyAddress = entry.dataKey.replace(dataKeySuffix, ''); // Извлекаем адрес из dataKey

                    // Получаем весь объект данных для этого года, чтобы найти timestamp и metadataCid
                    const kpiData = entry.payload;

                    const valueKey = `${companyAddress}_value`;
                    const timestampKey = `${companyAddress}_submissionTimestamp`;
                    const metadataCidKey = `${companyAddress}_metadataCid`;

                    const value = kpiData[valueKey];
                    const submissionTimestamp = kpiData[timestampKey] ? new Date(Number(kpiData[timestampKey]) * 1000).toLocaleString() : "N/A";
                    const metadataCid = kpiData[metadataCidKey];


                    if (value === undefined) return null; // Если данных для этой компании нет за этот год

                    const decodedValue = decodeKpiValue(value as bigint);
                    const metadataCidFormatted = formatMetadataCid(metadataCid);

                    return (
                        <div key={`item-${index}`} className="mb-2 last:mb-0">
                            <p style={{ color: entry.stroke }} className="font-semibold text-base">{getShortAddress(companyAddress)}</p>
                            <p>Значение: {decodedValue} {kpiUnit}</p>
                            <p>Обновлено: {submissionTimestamp}</p>
                            <p>CID: {metadataCidFormatted}</p>
                        </div>
                    );
                })}
            </div>
        );
    }

    return null;
};


// Компонент для отображения исторического графика KPI для нескольких компаний
function KpiHistoryGraph({companyAddresses, kpi, currentReportingYear}: {companyAddresses: string[], kpi: typeof kpiIdentifiers.ghgEmissionScopeOneAndTwoTotal, currentReportingYear: number}) {
    const [historyData, setHistoryData] = useState<any[]>([]); // Данные для recharts
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistoricalData = async () => {
            console.log("[KpiHistoryGraph] Начинаем загрузку исторических данных..."); // Лог начала загрузки
            setLoadingHistory(true);
            setHistoryError(null);
            // dataPointsMap теперь будет хранить плоские данные для recharts
            const dataPointsMap: { [year: number]: { year: number; [key: string]: number | bigint | string; } } = {};

            // Определяем диапазон лет для запроса (например, от текущего года и до 10 лет назад)
            const currentYear = new Date().getFullYear();
            const startYear = currentYear - 10; // Начинаем запрашивать с 10 лет назад
            const yearsToQuery = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);


            const allReadPromises: Promise<any>[] = [];

            companyAddresses.forEach(address => {
                yearsToQuery.forEach(year => {
                    // console.log(`[KpiHistoryGraph] Запрашиваем данные для ${getShortAddress(address)}, Год ${year}...`); // Лог запроса
                    allReadPromises.push(
                        readContract({
                            contract,
                            method: "getLatestKpiVersion",
                            params: [address, kpi.kpiId, year]
                        }).then((data) => {
                            const kpiData: KpiVersion | undefined = data as KpiVersion | undefined;

                            // console.log(`[KpiHistoryGraph] Получены необработанные данные для ${getShortAddress(address)}, Год ${year}:`, kpiData); // Лог необработанных данных

                            // Если контракт вернул дефолтные {0n, 0n, 0x...0}, интерпретируем как отсутствие данных (null для графика)
                            if (kpiData && (kpiData.value === 0n && kpiData.submissionTimestamp === 0n && kpiData.metadataCid === "0x0000000000000000000000000000000000000000000000000000000000000000")) {
                                // console.log(`[KpiHistoryGraph] Интерпретируем как отсутствие данных (пустая структура) для ${getShortAddress(address)}, Год ${year}.`);
                                return null;
                            }

                            if (kpiData && kpiData.value !== undefined) {
                                // console.log(`[KpiHistoryGraph] Данные найдены и будут использованы для ${getShortAddress(address)}, Год ${year}:`, kpiData);
                                return {
                                    companyAddress: address,
                                    year,
                                    value: Number(kpiData.value), // Передаем как Number для Recharts
                                    submissionTimestamp: kpiData.submissionTimestamp,
                                    metadataCid: kpiData.metadataCid
                                };
                            }
                            return null;
                        }).catch(err => {
                            // Если ошибка - это "No versions found for this KPI", интерпретируем как отсутствие данных (null для графика)
                            if (err && typeof err.message === 'string' && err.message.includes("No versions found for this KPI")) {
                                // console.warn(`[KpiHistoryGraph] Ожидаемая ошибка (нет данных) для ${getShortAddress(address)}, Год ${year}: ${err.message}.`);
                                return null;
                            } else {
                                // Логируем другие, неожиданные ошибки
                                console.error(`[KpiHistoryGraph] Неожиданная ошибка при получении данных за ${year} год для KPI ${kpi.name} и компании ${getShortAddress(address)}:`, err);
                                return null;
                            }
                        })
                    );
                });
            });

            try {
                const allSettledResults = await Promise.allSettled(allReadPromises);
                let foundAnyData = false; // Флаг, чтобы проверить, есть ли хоть какие-то данные
                let minDataYear = currentYear;
                let maxDataYear = startYear;

                allSettledResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value !== null) {
                        const { companyAddress, year, value, submissionTimestamp, metadataCid } = result.value;
                        if (!dataPointsMap[year]) {
                            dataPointsMap[year] = { year: year };
                        }
                        dataPointsMap[year][`${companyAddress}_value`] = value;
                        dataPointsMap[year][`${companyAddress}_submissionTimestamp`] = submissionTimestamp;
                        dataPointsMap[year][`${companyAddress}_metadataCid`] = metadataCid;
                        foundAnyData = true; // Мы нашли данные
                        if (year < minDataYear) minDataYear = year;
                        if (year > maxDataYear) maxDataYear = year;
                    }
                });

                // Если данных не было найдено, используем дефолтный или пустой диапазон
                if (!foundAnyData) {
                    minDataYear = currentYear; // Или просто `null` для пустого графика
                    maxDataYear = currentYear; // Это будет обрабатываться условием `hasAnyDataForGraph`
                } else {
                    // Расширяем диапазон на 1 год вперед и назад, чтобы линии не обрывались прямо на краю
                    minDataYear = Math.max(startYear, minDataYear - 1); // Не идем ниже startYear
                    maxDataYear = Math.min(currentYear, maxDataYear + 1); // Не идем выше currentYear
                }

                // Создаем массив данных для графика, включая годы без данных (чтобы оси были непрерывными)
                const finalData: any[] = [];
                for (let y = minDataYear; y <= maxDataYear; y++) {
                    finalData.push(dataPointsMap[y] || { year: y });
                }

                setHistoryData(finalData);
                console.log("[KpiHistoryGraph] Загрузка данных завершена. Итоговые данные для графика:", finalData); // Лог итоговых данных

            } catch (err: any) {
                setHistoryError(`Ошибка загрузки истории KPI: ${err.message}`);
                console.error("[KpiHistoryGraph] Общая ошибка загрузки истории KPI:", err);
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
            console.log("[KpiHistoryGraph] Нет валидных адресов компаний для загрузки данных."); // Лог, если адресов нет
        }
    }, [companyAddresses, kpi.kpiId]); // currentReportingYear больше не нужен как зависимость для диапазона лет

    if (loadingHistory) {
        return <div className="text-center text-zinc-300 mt-6 col-span-full">Загрузка исторической данных...</div>;
    }

    if (historyError) {
        return <div className="text-center text-red-400 mt-6 col-span-full">{historyError}</div>;
    }

    // Проверяем, есть ли хотя бы одна точка данных для отображения на графике
    const hasAnyValidDataPoint = historyData.some(yearData =>
        Object.keys(yearData).some(key => key !== 'year' && key.endsWith('_value') && yearData[key] !== undefined)
    );

    if (!hasAnyValidDataPoint && companyAddresses.some(address => ethers.utils.isAddress(address))) {
        return <div className="text-center text-zinc-300 mt-6 col-span-full">Исторические данные не найдены для выбранного KPI или все значения равны 0 для выбранных компаний.</div>;
    }

    return (
        <div className="mt-8 p-4 bg-zinc-800 rounded-lg shadow-lg w-full col-span-full">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">История "{kpi.name}"</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={historyData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                    <XAxis dataKey="year" stroke="#a3a3a3" tickFormatter={(tick) => String(tick)} />
                    <YAxis
                        stroke="#a3a3a3"
                        label={{ value: kpi.unit, angle: -90, position: 'insideLeft', fill: '#a3a3a3' }}
                        domain={[0, 'auto']} // Масштабируем ось Y, начиная с 0
                    />
                    <Tooltip
                        content={<CustomTooltip kpiUnit={kpi.unit} />} // Используем наш CustomTooltip
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#a3a3a3' }} formatter={(value: string) => getShortAddress(value.replace('_value', ''))} />
                    {companyAddresses.map((address, index) => ethers.utils.isAddress(address) && (
                        <Line
                            key={address}
                            type="monotone"
                            dataKey={`${address}_value`} // dataKey теперь указывает на числовое значение
                            stroke={COLORS[index % COLORS.length]}
                            activeDot={{ r: 8 }}
                            name={getShortAddress(address)} // Имя для легенды и тултипа
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
            // Устанавливаем начальное значение поля ввода адресов
            return params.get('company-address') || "0xECBbF4df772a579cC9a18a13e0C849f3d3C1e402, 0xcBf7E1043ca0Aa9a5D9C7d67E53dFd5a7839F872";
        }
        return "0xECBbF4df772a579cC9a18a13e0C849f3d3C1e402, 0xcBf7E1043ca0Aa9a5D9C7d67E53dFd5a7839F872";
    });
    const [companyAddresses, setCompanyAddresses] = useState<string[]>([]);
    const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);
    // const [reportingYear, setReportingYear] = useState(new Date().getFullYear()); // Удаляем ручной выбор года
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        const inputParts = companyAddressInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
        const valid = inputParts.filter(addr => ethers.utils.isAddress(addr));
        const invalid = inputParts.filter(addr => !ethers.utils.isAddress(addr));

        setCompanyAddresses(valid);
        setInvalidAddresses(invalid);
    }, [companyAddressInput]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const hasValidAddresses = companyAddresses.length > 0;

    return (
        <div className="relative p-4 pb-10 min-h-[100vh] container max-w-screen-lg mx-auto bg-gradient-to-br from-gray-900 to-blue-900 text-zinc-100">
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
                    url: "https://esg.fieldflow.lu"
                }}/>
            </div>
            <main className="flex flex-col items-center justify-start min-h-full w-full py-10">
                <div className="pt-20 pb-10 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-zinc-100">
                        Для Инвесторов - Просмотр данных ESG
                    </h1>
                    <p className="text-zinc-300 text-base mb-6">
                        Просматривайте ключевые KPI ESG компаний для принятия обоснованных инвестиционных решений.
                    </p>
                    <div className="flex flex-col items-center gap-4 mt-8 px-4">
                        <input type="text"
                               placeholder="0xECBbF4df772a579cC9a18a13e0C849f3d3C1e402, 0xcBf7E1043ca0Aa9a5D9C7d67E53dFd5a7839F872" // Обновленный плейсхолдер
                               value={companyAddressInput}
                               onChange={(e) => setCompanyAddressInput(e.target.value)}
                               className="border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-400 w-full max-w-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {invalidAddresses.length > 0 && (
                            <p className="mt-2 text-red-400 text-sm">
                                Неверные адреса: {invalidAddresses.join(', ')}. Пожалуйста, проверьте их.
                            </p>
                        )}
                        {/* Поле для выбора года удалено */}
                        {/* <input
                            type="number"
                            placeholder="Год Отчетности (например, 2025)"
                            value={reportingYear}
                            onChange={(e) => {
                                const year = parseInt(e.target.value, 10);
                                setReportingYear(isNaN(year) ? new Date().getFullYear() : year);
                            }}
                            className="border border-zinc-700 bg-white/10 p-2.5 rounded-lg text-zinc-100 placeholder-zinc-400 w-full max-w-md focus:ring-2 focus:ring-blue-500 outline-none"
                            min="1900"
                            max="2200"
                        /> */}
                    </div>
                    {isClient && hasValidAddresses && (
                        <>
                            {/* Удаляем блок с KPIComponent */}
                            {/* Отображаем исторический график для всех компаний */}
                            <KpiHistoryGraph
                                companyAddresses={companyAddresses}
                                kpi={kpiIdentifiers.ghgEmissionScopeOneAndTwoTotal}
                                // currentReportingYear больше не передается явно, KpiHistoryGraph сам определяет диапазон
                                currentReportingYear={new Date().getFullYear()} // Передаем текущий год как "максимальный" для запроса истории
                            />
                        </>
                    )}
                    {isClient && !hasValidAddresses && companyAddressInput.length > 0 && invalidAddresses.length === 0 && (
                        <p className="mt-4 text-red-400 text-sm">Пожалуйста, введите хотя бы один действительный адрес кошелька.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
