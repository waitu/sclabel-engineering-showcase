const STATUS_MAP = new Map([
  ["created", "pending"],
  ["accepted", "in_transit"],
  ["moving", "in_transit"],
  ["delivered", "delivered"],
  ["exception", "exception"],
]);

export function normalizeStatus(value) {
  return STATUS_MAP.get(String(value ?? "").trim().toLowerCase()) ?? "unknown";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TrackingClient {
  constructor({ fetchImpl, baseUrl = "https://api.example.invalid", maxRetries = 2, timeoutMs = 2_000, wait = delay }) {
    if (!fetchImpl) throw new Error("fetchImpl is required");
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
    this.wait = wait;
  }

  async #requestPage(page) {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.baseUrl}/shipments?page=${page}`, { signal: controller.signal });
        if (response.status === 429 && attempt < this.maxRetries) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          await this.wait(Math.max(retryAfter * 1_000, 10 * (2 ** attempt)));
          continue;
        }
        if (response.status >= 500 && attempt < this.maxRetries) {
          await this.wait(10 * (2 ** attempt));
          continue;
        }
        if (!response.ok) {
          const error = new Error(`Provider request failed with HTTP ${response.status}`);
          error.retryable = false;
          throw error;
        }
        return response.json();
      } catch (error) {
        if (error.retryable === false) throw error;
        if (attempt >= this.maxRetries) throw error;
        await this.wait(10 * (2 ** attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error("Retry budget exhausted");
  }

  async listAll({ maxPages = 100 } = {}) {
    const records = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await this.#requestPage(page);
      for (const item of payload.items ?? []) {
        records.push({ id: String(item.id), status: normalizeStatus(item.status) });
      }
      if (!payload.nextPage) return records;
    }
    throw new Error("Pagination safety limit reached");
  }
}
