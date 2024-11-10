import React from 'react';
import {Tooltip} from "react-tooltip";

export default function PackagingMaterialForm({ formData, setFormData, handleSubmit, isLoading, submitting }) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Tooltip id="tooltip-a25" content="Total packaging material used for finished products (in tonnes) and, if applicable, with reference to per unit produced." />
                <input
                    type="text"
                    placeholder="In toltal"
                    value={formData.packagingMaterialA25}
                    onChange={(e) => setFormData({ ...formData, packagingMaterialA25: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-a25"
                />
            </div>
            <div className="flex items-center gap-2">
                <Tooltip id="tooltip-a31" content="Description of the significant impacts of activities on the environment and natural resources and the actions taken to manage them." />
                <input
                    type="text"
                    placeholder="Impacts of activities"
                    value={formData.environmentalImpactA31}
                    onChange={(e) => setFormData({ ...formData, environmentalImpactA31: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-a31"
                />
            </div>
            <div className="flex items-center gap-2">
                <Tooltip id="tooltip-a41" content="Description of the significant climate-related issues which have impacted, and those which may impact, the issuer, and the actions taken to manage them." />
                <input
                    type="text"
                    placeholder="Climate-related issues"
                    value={formData.climateImpactA41}
                    onChange={(e) => setFormData({ ...formData, climateImpactA41: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-a41"
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
