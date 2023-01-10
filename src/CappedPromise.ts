// https://github.com/andreashuber69/capped-promise#--
interface Options {
    readonly cap: number;
}

export = class CappedPromise {
    public constructor(options?: Options) {
        ({ cap: this.#cap } = { cap: 5, ...options });

        if ((typeof this.#cap !== "number") || (this.#cap < 1)) {
            throw new RangeError(`options.cap is invalid: ${this.#cap}.`);
        }
    }

    public get cap() {
        return this.#cap;
    }

    readonly #cap: number;
};
