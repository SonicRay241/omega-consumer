type Callback<T> = (value: T) => void;

export class SubscriptionManager<T> {
    private values: Map<string, T> = new Map();
    private subscribers: Map<string, Map<string, Callback<T>>> = new Map();

    /**
     * Subscribes a callback to a specific valueId.
     */
    subscribe(valueId: string, subscriberId: string, callback: Callback<T>): void {
        if (!this.subscribers.has(valueId)) {
            this.subscribers.set(valueId, new Map());
        }

        const valueSubscribers = this.subscribers.get(valueId)!;
        valueSubscribers.set(subscriberId, callback);
    }

    /**
     * Unsubscribes a specific subscriberId from all valueIds.
     */
    unsubscribe(subscriberId: string): void {
        for (const [valueId, valueSubscribers] of this.subscribers) {
            valueSubscribers.delete(subscriberId);

            // If no subscribers are left, remove the valueId
            if (valueSubscribers.size === 0) {
                this.subscribers.delete(valueId);
                // this.values.delete(valueId); // Change to redis for prod
            }
        }
    }

    /**
     * Subscribe to other subscriberId
     */
    resubscribe(valueId: string, subscriberId: string, callback: Callback<T>) {
        this.unsubscribe(subscriberId)
        this.subscribe(valueId, subscriberId, callback)
    }

    /**
     * Updates the value for a specific valueId and notifies all its subscribers.
     */
    updateValue(valueId: string, newValue: T): void {
        this.values.set(valueId, newValue);

        const valueSubscribers = this.subscribers.get(valueId);
        if (valueSubscribers) {
            for (const [, callback] of valueSubscribers) {
                callback(newValue);
            }
        }
    }

    /**
     * Gets the current value for a specific valueId.
     */
    getValue(valueId: string): T | undefined {
        return this.values.get(valueId);
    }
}