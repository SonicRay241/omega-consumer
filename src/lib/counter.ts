export class CounterManager {
    private counters: Map<string, number>;

    constructor() {
        this.counters = new Map();
    }

    /**
     * Adds a value to the specified counter.
     * @param counterId - The unique identifier for the counter.
     * @param value - The number to add to the counter.
     */
    add(counterId: string, value: number): void {
        const current = this.counters.get(counterId) || 0;
        this.counters.set(counterId, current + value);
    }

    /**
     * Retrieves the value of a specific counter.
     * @param counterId - The unique identifier for the counter.
     * @returns The current value of the counter.
     */
    get(counterId: string): number {
        return this.counters.get(counterId) || 0;
    }

    /**
     * Resets all counters to zero.
     */
    clear(): void {
        this.counters.clear();
    }

    /**
     * Retrieves all counters and their values.
     * @returns A plain object with counter IDs as keys and their values.
     */
    getAll(): Record<string, number> {
        const result: Record<string, number> = {};
        this.counters.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
}
