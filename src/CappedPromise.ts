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

    public async all<T extends ReadonlyArray<() => unknown>>(
        createAwaitableArray: T
    ): Promise<{ -readonly [P in keyof T]: Awaited<ReturnType<T[P]>> }>;
    public async all<T>(createAwaitableIterable: Iterable<() => PromiseLike<T> | T>): Promise<Array<Awaited<T>>>;
    public async all(createAwaitableIterable: Iterable<() => unknown>) {
        const results = new Array<unknown>();
        const pending = new Array<Promise<number>>();

        for (const createAwaitable of createAwaitableIterable) {
            pending.push(
                CappedPromise.#awaitAndStoreResult(createAwaitable, results, pending.length),
            );

            if (pending.length === this.cap) {
                // eslint-disable-next-line no-await-in-loop
                pending.splice(await Promise.race(pending), 1);
            }
        }

        await Promise.all(pending);

        return results;
    }

    static async #awaitAndStoreResult(createAwaitable: unknown, results: unknown[], result: number) {
        if (typeof createAwaitable !== "function") {
            throw new TypeError(`createAwaitable is not a function: ${createAwaitable}.`);
        }

        const index = results.push(undefined) - 1;
        // eslint-disable-next-line require-atomic-updates
        results[index] = await createAwaitable();

        return result;
    }

    readonly #cap: number;
};
