export const collegeLogos = {
    "saint-louis": require("../college-logos/saint-louis.png"),
    "ut-dallas": require("../college-logos/ut-dallas.png"),
    webster: require("../college-logos/webster.png"),
    missouri: require("../college-logos/missouri.png"),
    "texas-tech": require("../college-logos/texas-tech.png"),
};

export function getCollegeLogo(key?: string | null) {
    if (!key) return null;

    return collegeLogos[key as keyof typeof collegeLogos] ?? null;
}