export const collegeLogos = {
    "saint-louis": require("../college-logos/saint-louis.png"),
    "ut-dallas": require("../college-logos/ut-dallas.png"),
    webster: require("../college-logos/webster.png"),
    missouri: require("../college-logos/missouri.png"),
    "texas-tech": require("../college-logos/texas-tech.png"),
    "houston": require("../college-logos/houston.png"),
    "arizona": require("../college-logos/arizona.png"),
    "duke": require("../college-logos/duke.png"),
    "michigan": require("../college-logos/michigan.png"),
    "florida": require("../college-logos/florida.jpeg"),
    "iowa-state": require("../college-logos/iowa-state.png"),
    "uconn": require("../college-logos/uconn.png"),
    "purdue": require("../college-logos/purdue.png"),
    "virginia": require("../college-logos/virginia.png"),
    "indiana": require("../college-logos/indiana.png"),
    "miami": require("../college-logos/miami.png"),
    "ole-miss": require("../college-logos/ole-miss.png"),
    "ohio-state": require("../college-logos/ohio-state.png"),
    "oregon": require("../college-logos/oregon.png"),
    "georgia": require("../college-logos/georgia.png"),
    "penn-state": require("../college-logos/penn-state.png"),
    "texas": require("../college-logos/texas.png"),
    "notre-dame": require("../college-logos/notre-dame.png"),
    "alabama": require("../college-logos/alabama.png"),
    "texas-am": require("../college-logos/texas-am.png"),
    "kentucky": require("../college-logos/kentucky.png"),
    "nebraska": require("../college-logos/nebraska.png"),
    "pittsburgh": require("../college-logos/pitt.png"),
    "wisconsin": require("../college-logos/wisconsin.png"),
    "stanford": require("../college-logos/standford.png"),
    "louisville": require("../college-logos/louisville.png"),
    "creighton": require("../college-logos/creighton.png"),
};

export function getCollegeLogo(key?: string | null) {
    if (!key) return null;

    return collegeLogos[key as keyof typeof collegeLogos] ?? null;
}