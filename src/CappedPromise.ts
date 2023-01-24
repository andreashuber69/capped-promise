// https://github.com/andreashuber69/capped-promise/blob/develop/README.md#----capped-promise
/**
 * Provides replacements for {@link Promise.all} and {@link Promise.allSettled} that limit the number of awaitables that
 * can simultaneously be pending.
 */
export = class CappedPromise {
    /**
     * Creates a {@link Promise} that is fulfilled with an array of results when all of the awaitables created by the
     * provided functions fulfill, or rejected when any of the created awaitables rejects.
     * @description Initially, the functions are called in the passed order to create at most `maxPending` awaitables.
     * Then, whenever one of those awaitables fulfills, the next function is called to bring the number of currently
     * pending awaitables back to `maxPending`. This process is repeated until no more functions are available, a
     * function throws or an awaitable rejects.
     * @param maxPending The maximum number of awaitables that are allowed to be pending simultaneously.
     * @param createAwaitableIterable An iterable of parameterless functions that create and return an awaitable.
     * @throws A {@link RangeError} when `maxPending` has either the wrong type or is smaller than 1.
     * @throws A {@link TypeError} when any value in `createAwaitableIterable` is not a function.
     */
    public static async all<T extends ReadonlyArray<() => unknown>>(
        maxPending: number,
        createAwaitableIterable: T,
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

    /**
     * Creates a {@link Promise} that is fulfilled with an array of results when all of the awaitables created by the
     * provided functions settle (fulfill or reject).
     * @description Initially, the functions are called in the passed order to create at most `maxPending` awaitables.
     * Then, whenever one of those awaitables settles, the next function is called to bring the number of currently
     * pending awaitables back to `maxPending`. This process is repeated until no more functions are available.
     * **Note**: If an argument violates a precondition (see below) then this is treated as an unintended catastrophic
     * failure and is propagated as a rejection immediately. The same is true if a provided function throws right away,
     * e.g. `() => { throw new Error("Oops!"); }`. If this is not what you expect, you should return a rejecting
     * {@link Promise}, as follows: `() => Promise.reject(new Error("Oops!"))`.
     * @param maxPending The maximum number of awaitables that are allowed to be pending simultaneously.
     * @param createAwaitableIterable An iterable of parameterless functions that create and return an awaitable.
     * @throws A {@link RangeError} when `maxPending` has either the wrong type or is smaller than 1.
     * @throws A {@link TypeError} when any value in `createAwaitableIterable` is not a function.
     */
    public static async allSettled<T extends ReadonlyArray<() => unknown>>(
        maxPending: number,
        createAwaitableIterable: T,
    ): Promise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<ReturnType<T[P]>>> }>;
    public static async allSettled<T>(
        maxPending: number,
        createAwaitableIterable: Iterable<() => PromiseLike<T> | T>,
    ): Promise<Array<PromiseSettledResult<Awaited<T>>>>;
    public static async allSettled(
        maxPending: number,
        createAwaitableIterable: Iterable<() => unknown>,
    ) {
        return await this.#all(maxPending, false, createAwaitableIterable);
    }

    /**
     * Objects of this class do not serve any purpose.
     * @deprecated
     */
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
            pending.set(nextIndex, this.#storeResult(createAwaitable(), results, nextIndex));
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
        awaitable: unknown,
        results: Array<PromiseSettledResult<unknown>>,
        index: number,
    ) {
        results[index] = await this.#getResult(awaitable);

        return index;
    }

    static async #getResult(awaitable: unknown): Promise<PromiseSettledResult<unknown>> {
        try {
            return { status: "fulfilled", value: await awaitable };
        } catch (error: unknown) {
            return { status: "rejected", reason: error };
        }
    }
};
