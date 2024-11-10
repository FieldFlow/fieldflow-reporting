import React from 'react';
import {Tooltip} from "react-tooltip";

export default function GHGEmissionForm({ formData, setFormData, handleSubmit, isLoading, submitting }) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Types and data"
                    value={formData.ghgEmissionA11}
                    onChange={(e) => setFormData({ ...formData, ghgEmissionA11: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-ghgEmissionA11"
                />
                <Tooltip id="tooltip-ghgEmissionA11" content="The types of emissions and respective emissions data." />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="In total & intensity"
                    value={formData.ghgEmissionA12}
                    onChange={(e) => setFormData({ ...formData, ghgEmissionA12: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-ghgEmissionA12"
                />
                <Tooltip id="tooltip-ghgEmissionA12" content="GHG emissions in total (in tonnes) and, where appropriate, intensity." />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Measures & results"
                    value={formData.ghgEmissionA15}
                    onChange={(e) => setFormData({ ...formData, ghgEmissionA15: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-ghgEmissionA15"
                />
                <Tooltip id="tooltip-ghgEmissionA15" content="Description of measures to mitigate emissions and results achieved." />
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
