import React from 'react';
import {Tooltip} from "react-tooltip";

export default function WaterConsumptionForm({ formData, setFormData, handleSubmit, isLoading, submitting }) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Tooltip id="tooltip-a22" content="Water consumption in total and intensity." />
                <input
                    type="text"
                    placeholder="In total"
                    value={formData.waterConsumptionA22}
                    onChange={(e) => setFormData({ ...formData, waterConsumptionA22: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-a22"
                />
            </div>
            <div className="flex items-center gap-2">
                <Tooltip id="tooltip-a24" content="Description of whether there is any issue in sourcing water that is fit for purpose, water efficiency initiatives and results achieved." />
                <input
                    type="text"
                    placeholder="Description"
                    value={formData.waterConsumptionA24}
                    onChange={(e) => setFormData({ ...formData, waterConsumptionA24: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-a24"
                />
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
