
interface ProfileStats {
    followerCount?: number;
    followingCount?: number;
    videoCount?: number; // Media count for IG
    heartCount?: number;
}

interface ProfileData {
    username: string;
    nickname?: string;
    signature?: string; // Bio
    stats: ProfileStats;
    isVerified?: boolean;
}

interface ClassificationResult {
    isQualified: boolean;
    score: number;
    subScores: Record<string, number>; // Breakdown of points
    signals: string[]; // Matched keywords/rules
    reasons: string[]; // Fail reasons
}

// Configuration (mirroring socialscrape settings where visible)
const CONFIG = {
    FOLLOWER_MIN: 500,
    FOLLOWER_MAX: 500000, // Implied upper bound for micro-influencers
    PASS_THRESHOLD: 20, // Points needed
    MEDIA_MIN: 5,
};

export class SocialClassifier {

    // --- SIGNALS ---
    // Adapted from tiktok_classifier.py

    private static POSITIVE_SIGNALS = {
        "identity_keywords": {
            points: 10, keywords: [
                "foodie", "eats", "food review", "food lover", "tasting",
                "cook", "chef", "baking", "recipe", "mukbang",
                "ugc", "creator", "influencer", "lifestyle", "blogger", "vlogger"
            ]
        },
        "niche_keywords": {
            points: 10, keywords: [
                "matcha", "boba", "sushi", "tacos", "kbbq", "hotpot",
                "ramen", "birria", "street food", "hidden gems", "la food",
                "oc food", "sd food", "socal food", "food hacks", "coffee", "cafe"
            ]
        },
        "location_strong": {
            points: 25, keywords: [
                "los angeles", "la", "dtla", "hollywood", "santa monica",
                "orange county", "oc", "irvine", "anaheim", "huntington beach",
                "san diego", "sd", "convoy", "north park", "socal", "california",
                "nyc", "new york", "brooklyn", "manhattan" // Added some generals just in case
            ]
        },
        "intent_commercial": {
            points: 20, keywords: [
                "collab", "partnership", "promo", "dm for", "email", "gmail",
                "business", "inquiries", "link in bio", "storefront", "amazon", "management"
            ]
        }
    };

    private static NEGATIVE_SIGNALS = {
        "business": {
            points: -25, keywords: [
                "official page", "brand", "company", "store", "shop", "app",
                "delivery", "shipping", "order now", "customer service"
            ]
        },
        "spam": {
            points: -50, keywords: [
                "crypto", "invest", "forex", "money", "betting", "casino", "nft", "wealth"
            ]
        }
    };

    static classify(profile: ProfileData): ClassificationResult {
        const result: ClassificationResult = {
            isQualified: false,
            score: 0,
            subScores: {},
            signals: [],
            reasons: []
        };

        const stats = profile.stats;

        // 1. HARD FILTERS
        // Note: If stats are missing (undefined/0), we might skip hard filters or auto-fail.
        // For dorking, sometimes we don't have exact stats. 
        // Logic: specific valid stats -> check range. Unknown stats -> pass (benefit of doubt) or fail?
        // Let's assume if stats are present (>0), we check them.

        if (stats.followerCount !== undefined && stats.followerCount > 0) {
            if (stats.followerCount < CONFIG.FOLLOWER_MIN) {
                result.reasons.push(`Followers ${stats.followerCount} < ${CONFIG.FOLLOWER_MIN}`);
            }
            if (stats.followerCount > CONFIG.FOLLOWER_MAX) {
                result.reasons.push(`Followers ${stats.followerCount} > ${CONFIG.FOLLOWER_MAX}`);
            }
        }

        if (stats.videoCount !== undefined && stats.videoCount > 0) {
            if (stats.videoCount < CONFIG.MEDIA_MIN) {
                result.reasons.push(`Media count ${stats.videoCount} < ${CONFIG.MEDIA_MIN}`);
            }
        }

        if (result.reasons.length > 0) {
            return result; // Hard fail
        }

        // 2. TEXT SCORING
        const textToScan = `${profile.signature || ''} ${profile.nickname || ''} ${profile.username}`.toLowerCase();

        // Positive
        for (const [key, config] of Object.entries(this.POSITIVE_SIGNALS)) {
            if (config.keywords.some(k => textToScan.includes(k))) {
                result.score += config.points;
                result.subScores[key] = config.points;
                result.signals.push(key);
            }
        }

        // Negative
        for (const [key, config] of Object.entries(this.NEGATIVE_SIGNALS)) {
            if (config.keywords.some(k => textToScan.includes(k))) {
                result.score += config.points;
                result.subScores[key] = config.points;
                result.signals.push(`MINUS_${key}`);
            }
        }

        // 3. THRESHOLD CHECK
        result.isQualified = result.score >= CONFIG.PASS_THRESHOLD;

        if (!result.isQualified) {
            result.reasons.push(`Score ${result.score} < ${CONFIG.PASS_THRESHOLD}`);
        }

        return result;
    }
}
