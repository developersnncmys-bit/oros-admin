export default function StatCard({ label, value, delta }) {
    const hasDelta = typeof delta === "number" && !Number.isNaN(delta);
    const isPositive = hasDelta && delta >= 0;

    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                {label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-extrabold text-text">{value}</p>
                {hasDelta && (
                    <span
                        className={`text-xs font-bold ${
                            isPositive ? "text-emerald-600" : "text-red-500"
                        }`}
                    >
                        {isPositive ? "▲" : "▼"} {Math.abs(delta)}%
                    </span>
                )}
            </div>
        </div>
    );
}
