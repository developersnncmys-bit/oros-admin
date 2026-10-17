// Backend list responses aren't perfectly consistent about the wrapper
// key (singular vs plural). This tries every likely key before giving up.
export const extractList = (data, keys = []) => {
    if (!data) {
        return [];
    }

    for (const key of keys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    if (Array.isArray(data)) {
        return data;
    }

    return [];
};
