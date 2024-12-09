class StateHandler<T> {
    private _state: T;

    constructor(initialValue: T, private onChange: (value: T) => void) {
        this._state = initialValue;
    }

    get state(): T {
        return this._state;
    }

    set state(newValue: T) {
        if (newValue !== this._state) {
            this._state = newValue;
            this.onChange(newValue);
        }
    }
}