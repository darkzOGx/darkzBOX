import random
import itertools
from typing import Optional
from config import Config

class ProxyManager:
    """
    Manages proxy rotation and session stickiness.
    """
    
    def __init__(self):
        raw_proxies = Config.PROXY_LIST
        self._proxies = [p for p in raw_proxies if p]
        self._iterator = itertools.cycle(self._proxies) if self._proxies else None
        self._current_proxy = None

    def get_proxy(self) -> Optional[str]:
        """
        Returns a proxy string in the format required by httpx/playwright.
        Rotates to the next one in the list.
        """
        if not self._proxies:
            return None
        
        # Simple round-robin rotation
        self._current_proxy = next(self._iterator)
        return self._current_proxy

    def get_sticky_proxy(self) -> Optional[str]:
        """Returns the current proxy without rotating, useful for session consistency."""
        if not self._current_proxy and self._proxies:
            return self.get_proxy()
        return self._current_proxy

    def report_failure(self):
        """
        Signal that the current proxy failed (429/Ban). 
        Triggers a rotation on the next get_proxy call implies we just move on.
        """
        # In a more complex system, we might temporarily blacklist this proxy.
        # For now, we just rotate.
        self.get_proxy()

class ProxyBurnedException(Exception):
    """Raised when a 429 or Soft Ban is detected."""
    pass
