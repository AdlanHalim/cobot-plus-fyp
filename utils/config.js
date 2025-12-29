let runtimeConfig = null;

export function loadConfig() {
  return fetch('/config.json')
    .then((res) => {
      // Check if response is OK (status 200-299)
      if (!res.ok) {
        throw new Error(`Config not found (${res.status})`);
      }
      // Check content type to ensure it's JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Config response is not JSON');
      }
      return res.json();
    })
    .then((data) => {
      runtimeConfig = data;
    })
    .catch((err) => {
      console.warn("Runtime config not loaded, using defaults:", err.message);
      runtimeConfig = { apiBaseUrl: process.env.NEXT_PUBLIC_PI_URL || "http://localhost:5000" };
    });
}

export function getConfig() {
  return runtimeConfig;
}
