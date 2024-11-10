import React from 'react';
import {Tooltip} from "react-tooltip";

export default function HazardousWasteForm({ formData, setFormData, handleSubmit, isLoading, submitting }) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="In total"
                    value={formData.hazardousWasteA13}
                    onChange={(e) => setFormData({ ...formData, hazardousWasteA13: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-hazardousWasteA13"
                />
                <Tooltip id="tooltip-hazardousWasteA13" content="Total hazardous waste produced (in tonnes) and, where appropriate, intensity." />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Description"
                    value={formData.hazardousWasteA16}
                    onChange={(e) => setFormData({ ...formData, hazardousWasteA16: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-hazardousWasteA16"
                />
                <Tooltip id="tooltip-hazardousWasteA16" content="Description of how hazardous wastes are handled, reduction initiatives and results achieved." />
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
