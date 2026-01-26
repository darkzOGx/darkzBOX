import logging

logger = logging.getLogger(__name__)

class TikTokSigner:
    """
    Handles signatures for TikTok internal API requests.
    Requires integration with a local Node.js service for X-Bogus generation.
    """
    
    @staticmethod
    def get_x_bogus(url: str, user_agent: str) -> str:
        """
        Generates the X-Bogus parameter by calling the local Node.js signer service.
        """
        try:
            import requests # Lazy import to avoid loop issues if any, though standard import is fine
            response = requests.post(
                "http://localhost:3000/sign",
                json={"url": url, "user_agent": user_agent},
                timeout=5
            )
            if response.status_code == 200:
                return response.json().get("x_bogus", "")
            else:
                logger.error(f"Signer service error: {response.text}")
                return ""
        except Exception as e:
            logger.error(f"Failed to connect to signer service: {e}")
            return "DEFAULT_BOGUS"
