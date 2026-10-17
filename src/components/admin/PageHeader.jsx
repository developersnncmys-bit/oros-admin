export default function PageHeader({ actions }) {
    if (!actions) {
        return null;
    }

    return <div className="mb-5 flex items-center justify-end gap-3">{actions}</div>;
}
