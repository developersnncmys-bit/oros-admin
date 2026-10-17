const TONES = {
    neutral: "bg-bg text-text-muted",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-emerald-50 text-emerald-600",
    danger: "bg-red-50 text-red-600",
    warning: "bg-amber-50 text-amber-600",
    quotation: "bg-violet-100 text-violet-600",
    store: "bg-sky-100 text-sky-700",
    dark: "bg-slate-900 text-white",
    solid: "bg-slate-200 text-text",
    outline: "border border-border bg-white text-text"
};

export default function Badge({ children, tone = "neutral" }) {
    return (
        <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${TONES[tone] || TONES.neutral}`}
        >
            {children}
        </span>
    );
}
