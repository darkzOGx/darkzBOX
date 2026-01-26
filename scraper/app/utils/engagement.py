import statistics

class EngagementAnalyzer:
    """
    V3.0 Engagement Analysis
    Focuses on Consistency and Average View Counts over Viral Spikes.
    """
    
    ENGAGEMENT_THRESHOLDS = {
        # View-based (PRIMARY for short-form)
        "views_excellent": 5000,    # +15 points
        "views_good": 1000,         # +10 points (TARGET)
        "views_acceptable": 500,    # +5 points (MINIMUM)
        "views_poor": 200,          # 0 points, but don't reject
        
        # Like-based (SECONDARY)
        "likes_excellent": 500,     # +10 points
        "likes_good": 100,          # +5 points
        "likes_acceptable": 50,     # +2 points
        
        # Comment-based (QUALITY signal)
        "comments_engaged": 10,     # +5 points
        "comments_some": 5,         # +2 points
    }

    @classmethod
    def analyze_engagement(cls, posts: list, min_posts=5) -> dict:
        """
        Analyze last 10 posts for engagement patterns
        Focus on CONSISTENCY over viral spikes
        """
        if len(posts) < min_posts:
            return {
                "score": 0,
                "status": "insufficient_data",
                "avg_views": 0,
                "consistency": 0,
                "post_count": len(posts)
            }
        
        # Extract metrics (clamp to last 10)
        recent_posts = posts[:10]
        views = [p.get("view_count", 0) or 0 for p in recent_posts]
        likes = [p.get("like_count", 0) or 0 for p in recent_posts]
        comments = [p.get("comment_count", 0) or 0 for p in recent_posts]
        
        # Calculate averages
        avg_views = sum(views) / len(views) if views else 0
        avg_likes = sum(likes) / len(likes) if likes else 0
        avg_comments = sum(comments) / len(comments) if comments else 0
        
        # Calculate consistency (1 - Coefficient of Variation)
        # CV = Stdev / Mean. Lower CV = Higher Consistency.
        if avg_views > 0 and len(views) > 1:
            try:
                stdev = statistics.stdev(views)
                cv = stdev / avg_views
                consistency = max(0, min(1, 1 - (cv / 2))) # Normalize rough approximation
                
                # If CV is > 1 (Variance > Mean), consistency drops.
                # Simplification: Just use 1 - (stdev/mean) clipped.
                # A viral spike makes stdev huge. We want consistent views.
                
                # V3 Logic: 
                # consistency = 1 - (statistics.stdev(views) / avg_views)
                # consistency = max(0, min(1, consistency))
            except:
                consistency = 0.5
        else:
            consistency = 0
        
        # SCORING
        score = 0
        
        # View scoring (primary)
        if avg_views >= cls.ENGAGEMENT_THRESHOLDS["views_excellent"]:
            score += 15
        elif avg_views >= cls.ENGAGEMENT_THRESHOLDS["views_good"]:
            score += 10
        elif avg_views >= cls.ENGAGEMENT_THRESHOLDS["views_acceptable"]:
            score += 5
        elif avg_views >= cls.ENGAGEMENT_THRESHOLDS["views_poor"]:
            score += 2
        
        # Like scoring (secondary)
        if avg_likes >= cls.ENGAGEMENT_THRESHOLDS["likes_excellent"]:
            score += 10
        elif avg_likes >= cls.ENGAGEMENT_THRESHOLDS["likes_good"]:
            score += 5
        elif avg_likes >= cls.ENGAGEMENT_THRESHOLDS["likes_acceptable"]:
            score += 2
        
        # Comment scoring (quality)
        if avg_comments >= cls.ENGAGEMENT_THRESHOLDS["comments_engaged"]:
            score += 5
        elif avg_comments >= cls.ENGAGEMENT_THRESHOLDS["comments_some"]:
            score += 2
        
        # Consistency bonus (Modified from V3 spec to be safe)
        if consistency >= 0.7:
            score += 5  # Very consistent
        elif consistency >= 0.5:
            score += 2  # Somewhat consistent
        
        # Determine status
        if avg_views >= 1000:
            status = "target_match"
        elif avg_views >= 500:
            status = "acceptable"
        elif avg_views >= 200:
            status = "borderline"
        else:
            status = "low_engagement"
        
        return {
            "score": score,
            "status": status,
            "avg_views": avg_views,
            "avg_likes": avg_likes,
            "avg_comments": avg_comments,
            "consistency": consistency,
            "post_count": len(recent_posts)
        }
