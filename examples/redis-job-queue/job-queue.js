export class InMemoryQueue {
  #items = [];

  async enqueue(job) { this.#items.push(structuredClone(job)); }
  async dequeue() { return this.#items.shift() ?? null; }
  get size() { return this.#items.length; }
}

export class RetryWorker {
  constructor({ queue, handler, maxAttempts = 3, baseDelayMs = 10, wait = () => Promise.resolve() }) {
    this.queue = queue;
    this.handler = handler;
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.wait = wait;
    this.completed = new Set();
    this.deadLetters = [];
  }

  async runOnce() {
    const job = await this.queue.dequeue();
    if (!job) return { state: "idle" };
    if (this.completed.has(job.idempotencyKey)) return { state: "duplicate", job };

    const attempt = (job.attempt ?? 0) + 1;
    try {
      const result = await this.handler(job.payload);
      this.completed.add(job.idempotencyKey);
      return { state: "completed", job: { ...job, attempt }, result };
    } catch (error) {
      const failed = { ...job, attempt, lastError: error.message };
      if (attempt >= this.maxAttempts) {
        this.deadLetters.push(failed);
        return { state: "dead-lettered", job: failed };
      }
      await this.wait(this.baseDelayMs * (2 ** (attempt - 1)));
      await this.queue.enqueue(failed);
      return { state: "retrying", job: failed };
    }
  }
}
