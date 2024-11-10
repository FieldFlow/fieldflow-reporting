import React from 'react';
import {Tooltip} from "react-tooltip";

export default function NonHazardousWasteForm({ formData, setFormData, handleSubmit, isLoading, submitting }) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Tooltip id="tooltip-a14" content="Total non-hazardous waste produced (in tonnes) and, where appropriate, intensity." />
                <input
                    type="text"
                    placeholder="In total"
                    value={formData.nonHazardousWasteA14}
                    onChange={(e) => setFormData({ ...formData, nonHazardousWasteA14: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-a14"
                />
            </div>
            <div className="flex items-center gap-2">
                <Tooltip id="tooltip-a16" content="Description of how non-hazardous wastes are handled, reduction initiatives and results achieved." />
                <input
                    type="text"
                    placeholder="Description"
                    value={formData.nonHazardousWasteA16}
                    onChange={(e) => setFormData({ ...formData, nonHazardousWasteA16: e.target.value })}
                    className="border border-zinc-800 p-2 rounded-lg text-zinc-900"
                    data-tooltip-id="tooltip-a16"
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
