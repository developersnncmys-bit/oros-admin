export default function Logo({ tone = "dark", subtitle = "Admin" }) {
    const isDark = tone === "dark";

    return (
        <div className="flex items-center gap-3">
            <img
                src="/logo/Orosent-20.svg"
                alt="OROS"
                className={`h-10 w-10 rounded-xl object-contain ${
                    isDark ? "bg-white" : "bg-transparent"
                }`}
            />
            <div className="leading-tight">
                <p
                    className={`text-lg font-extrabold tracking-tight ${
                        isDark ? "text-white" : "text-text"
                    }`}
                >
                    OROS
                </p>
                <p
                    className={`text-[11px] font-medium uppercase tracking-widest ${
                        isDark ? "text-white/60" : "text-text-muted"
                    }`}
                >
                    {subtitle}
                </p>
            </div>
        </div>
    );
}
