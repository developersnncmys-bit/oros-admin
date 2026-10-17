export default function FormField({ label, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-muted">
                {label}
            </label>
            {children}
        </div>
    );
}

export const inputClass =
    "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
