export const formatDuration = (totalSeconds = 0) => {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
};

export const formatTimeAgo = (date) => {
    if (!date) {
        return "";
    }

    const diffMs = Date.now() - new Date(date).getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
        return "just now";
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
        return `${diffDays}d ago`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
        return `${diffMonths}mo ago`;
    }

    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y ago`;
};

export const formatCurrency = (value = 0) => {
    return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
};

export const slugify = (value = "") => {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
};

export const formatDate = (date) => {
    if (!date) {
        return "—";
    }

    return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};
