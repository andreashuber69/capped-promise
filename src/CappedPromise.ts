// https://github.com/andreashuber69/capped-promise#--
export = class CappedPromise {
    public static async all<T extends ReadonlyArray<() => unknown>>(
        maxPending: number,
        createAwaitableArray: T,
    ): Promise<{ -readonly [P in keyof T]: Awaited<ReturnType<T[P]>> }>;
    public static async all<T>(
        maxPending: number,
        createAwaitableIterable: Iterable<() => PromiseLike<T> | T>,
    ): Promise<Array<Awaited<T>>>;
    public static async all(
        maxPending: number,
        createAwaitableIterable: Iterable<() => unknown>,
    ) {
        const results = await this.#all(maxPending, true, createAwaitableIterable);

        return results.map((r) => (r.status === "fulfilled" ? r.value : undefined));
    }

    private constructor() {}

    static async #all(
        maxPending: number,
        propagateRejections: boolean,
        createAwaitableIterable: Iterable<() => unknown>,
    ) {
        if (typeof maxPending !== "number" || maxPending < 1) {
            throw new RangeError(`maxPending is invalid: ${maxPending}.`);
        }

        let nextIndex = 0;
        const pending = new Map<number, Promise<number>>();
        const results = new Array<PromiseSettledResult<unknown>>();

        for (const createAwaitable of createAwaitableIterable) {
            if (typeof createAwaitable !== "function") {
                throw new TypeError(`createAwaitable is not a function: ${createAwaitable}.`);
            }

            // eslint-disable-next-line no-await-in-loop
            await this.#settle(pending, results, propagateRejections, maxPending - 1);
            pending.set(nextIndex, this.#storeResult(createAwaitable, results, nextIndex));
            ++nextIndex;
        }

        await this.#settle(pending, results, propagateRejections, 0);

        return results;
    }

    static async #settle(
        pending: Map<number, Promise<number>>,
        results: Array<PromiseSettledResult<unknown>>,
        propagateRejections: boolean,
        maxPending: number,
    ) {
        while (pending.size > maxPending) {
            // eslint-disable-next-line no-await-in-loop
            const settledIndex = await Promise.race(pending.values());
            pending.delete(settledIndex);
            const result = results[settledIndex];

            if (propagateRejections && (result?.status === "rejected")) {
                throw result.reason;
            }
        }
    }

    static async #storeResult(
        createAwaitable: () => unknown,
        results: Array<PromiseSettledResult<unknown>>,
        index: number,
    ) {
        results[index] = await this.#getResult(createAwaitable);

        return index;
    }

    static async #getResult(createAwaitable: () => unknown): Promise<PromiseSettledResult<unknown>> {
        try {
            return { status: "fulfilled", value: await createAwaitable() };
        } catch (error: unknown) {
            return { status: "rejected", reason: error };
        }
    }
};
