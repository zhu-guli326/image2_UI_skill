(function () {
  const config = window.IMAGE2_ANALYTICS || {};
  const endpoint = config.endpoint;
  const sessionKey = "image2-ui-library-session";

  function getSessionId() {
    try {
      const existing = window.sessionStorage.getItem(sessionKey);
      if (existing) return existing;
      const value = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.sessionStorage.setItem(sessionKey, value);
      return value;
    } catch {
      return "anonymous";
    }
  }

  function send(event) {
    if (!config.enabled || !endpoint || location.protocol === "file:") return;
    const body = JSON.stringify(event);
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      if (accepted) return;
    }
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }

  window.image2Analytics = {
    track(name, properties = {}) {
      send({
        name,
        properties,
        site: config.site || "image2-ui-library",
        path: location.pathname,
        sessionId: getSessionId(),
        occurredAt: new Date().toISOString()
      });
    }
  };
})();
