"use client";

import Image from "next/image";
import { ConnectButton } from "thirdweb/react";
import logoIcon from "../../public/logo.svg";
import { client } from "./client";
import Link from "next/link";

export default function Home() {
    return (
        <div className="relative p-4 pb-10 min-h-[100vh] container max-w-screen-lg mx-auto">
            <div className="fixed top-4 right-4">
                <ConnectButton
                    client={client}
                    appMetadata={{
                        name: "ESG KPI Reporting System",
                        url: "https://esg.filedflow.lu",
                    }}
                />
            </div>
            <main className="flex items-center justify-center min-h-full">
                <div className="py-20">
                    <Header />
                    <ThirdwebResources />
                </div>
            </main>
        </div>
    );
}

function Header() {
    return (
        <header className="flex flex-col items-center mb-20 md:mb-20">
            <Image
                src={logoIcon}
                alt=""
                className="size-[150px] md:size-[150px]"
                style={{
                    filter: "drop-shadow(0px 0px 24px #a726a9a8)",
                }}
            />

            <h1 className="text-2xl md:text-6xl font-semibold md:font-bold tracking-tighter mb-6 text-zinc-100">
                <span className="text-zinc-300 inline-block mx-1">  </span>
                <span className="inline-block -skew-x-6 text-blue-500">ESG</span>
                <span className="text-zinc-300 inline-block mx-1">  </span>
                Reporting
            </h1>

            <p className="text-zinc-300 text-base">
                Please, connect your
                <code className="bg-zinc-800 text-zinc-300 px-2 rounded py-1 text-sm mx-1">
                    Web3
                </code>{" "}
                wallet to get started.
            </p>
        </header>
    );
}

function ThirdwebResources() {
    return (
        <div className="grid gap-4 lg:grid-cols-2 justify-center">
            <ArticleCard
                title="For Companies"
                href="/for-companies"
                description="Report ESG KPIs"
            />

            <ArticleCard
                title="For Investors"
                href="/for-investors"
                description="Compare companies"
            />

            {/*<ArticleCard*/}
            {/*    disabled*/}
            {/*    title="For People"*/}
            {/*    href="/for-people"*/}
            {/*    description="Assess ESG KPI data, processed by explainable AI."*/}
            {/*/>*/}
        </div>
    );
}

function ArticleCard(props: {
    title: string;
    href: string;
    description: string;
}) {
    return (
        <Link
            href={props.href}
            className="flex flex-col border border-zinc-800 p-4 rounded-lg hover:bg-zinc-900 transition-colors hover:border-zinc-700"
        >
            <article>
                <h2 className="text-lg font-semibold mb-2">{props.title}</h2>
                <p className="text-sm text-zinc-400">{props.description}</p>
            </article>
        </Link>
    );
}
