let runtimeConfig = null;

export function loadConfig() {
  return fetch('/config.json')
    .then((res) => res.json())
    .then((data) => {
      runtimeConfig = data;
    })
    .catch((err) => {
      console.error("Failed to load runtime config:", err);
      runtimeConfig = { apiBaseUrl: "http://localhost:5000" }; // fallback URL
    });
}

export function getConfig() {
  return runtimeConfig;
}
