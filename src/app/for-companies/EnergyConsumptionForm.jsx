import React from 'react';
import {Tooltip} from "react-tooltip";

export default function EnergyConsumptionForm({ formData, setFormData, handleSubmit, isLoading, submitting }) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="In total & types"
                    value={formData.energyConsumptionA21}
                    onChange={(e) => setFormData({ ...formData, energyConsumptionA21: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-energyConsumptionA21"
                />
                <Tooltip id="tooltip-energyConsumptionA21" content="Direct and/or indirect energy consumption by type (e.g., electricity, gas or oil) in total (kW·h) and intensity." />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Efficiency & results"
                    value={formData.energyConsumptionA23}
                    onChange={(e) => setFormData({ ...formData, energyConsumptionA23: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-energyConsumptionA23"
                />
                <Tooltip id="tooltip-energyConsumptionA23" content="Description of energy efficiency initiatives and results achieved." />
            </div>
            <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                disabled={isLoading || submitting}
            >
                {submitting ? "Submitting..." : "Submit"}
            </button>
        </form>
    );
}
