// https://github.com/andreashuber69/capped-promise/blob/develop/README.md#----capped-promise
import assert from "node:assert";
import { describe, it } from "node:test";
import fetch from "node-fetch";

import CappedPromise from "./CappedPromise";

const iterable = function *iterable() {
    yield async () => await Promise.resolve(1);
    yield async () => await Promise.resolve(2);
};

const delay = async <T>(delayMilliseconds: number, result: T) =>
    await new Promise<T>((resolve) => setTimeout(() => resolve(result), delayMilliseconds));

type State = "init" | "pending" | "settled";

describe("CappedPromise", () => {
    describe("all", () => {
        it("should correctly infer the types for tuples", async () => {
            const argument = [
                async () => await Promise.resolve(1),
                async () => await Promise.resolve("hello"),
            ] as const;

            const [result0, result1]: [number, string] = await CappedPromise.all(5, argument);

            assert(result0 === 1);
            assert(result1 === "hello");
        });

        it("should correctly infer the types for iterables", async () => {
            const [result0, result1]: number[] = await CappedPromise.all(5, iterable());

            assert(result0 === 1);
            assert(result1 === 2);
        });

        it("should only create new awaitables when all previous ones are pending or settled", async () => {
            const states = new Array<State>(5).fill("init");

            const argument = states.map((_, index, array) => (
                async () => {
                    // Previous awaitables must be pending or settled
                    assert(array.findIndex((state) => state !== "pending" && state !== "settled") === index);
                    // Next awaitables must be in initial state
                    assert(array.slice(index).findIndex((state) => state !== "init") === -1);
                    const promise = Promise.resolve(index);
                    array[index] = "pending";

                    try {
                        return await promise;
                    } finally {
                        // eslint-disable-next-line require-atomic-updates
                        array[index] = "settled";
                    }
                }
            ));

            const results = await CappedPromise.all(3, argument);

            for (const [index, value] of results.entries()) {
                assert(value === index);
            }
        });

        it("should fulfill with empty array if passed empty array", async () => {
            assert((await CappedPromise.all(5, [])).length === 0);
        });

        it("should add results in the awaitable creation order", async () => {
            const argument = [
                async () => await delay(300, 0),
                async () => await delay(200, 1),
                async () => await delay(100, 2),
            ] as const;

            const results = await CappedPromise.all(3, argument);

            for (const [index, value] of results.entries()) {
                assert(value === index);
            }
        });

        it("should work with example code", async () => {
            /* eslint-disable @typescript-eslint/promise-function-async */
            // eslint-disable-next-line unicorn/consistent-function-scoping
            const getText = async (url: string) => {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Unexpected response");
                }

                return await response.text();
            };

            const cssUrls = [
                "https://fonts.googleapis.com/css2?family=Roboto",
                "https://fonts.googleapis.com/css2?family=Open+Sans",
                "https://fonts.googleapis.com/css2?family=Poppins",
            ];

            // Promise.all
            // We pass already pending promises.
            const cssPromises = cssUrls.map((url) => getText(url));
            // All requests are made at the same time.
            const promiseResults = await Promise.all(cssPromises);

            // CappedPromise.all
            // We pass promise-creating functions instead of promises.
            const createCssPromises = cssUrls.map((url) => () => getText(url));
            // We allow at most 2 simultaneous requests. So, in the beginning the first
            // two promises are created right away. As soon as one of those is fulfilled,
            // the third is automatically created. When the responses for all requests are
            // in, the returned promise fulfills.
            const cappedResults = await CappedPromise.all(2, createCssPromises);

            assert(cappedResults.length === promiseResults.length);

            for (const [index, result] of cappedResults.entries()) {
                assert(result === promiseResults[index]);
            }
            /* eslint-enable @typescript-eslint/promise-function-async */
        });

        it("should reject for invalid maxPending", async () => {
            try {
                await CappedPromise.all(0, []);
            } catch (error) {
                assert(error instanceof RangeError);
                assert(error.message === "maxPending is invalid: 0.");
            }
        });

        it("should reject for non-functions", async () => {
            try {
                await CappedPromise.all(5, [42 as unknown as () => Promise<number>]);
            } catch (error) {
                assert(error instanceof TypeError);
                assert(error.message === "createAwaitable is not a function: 42.");
            }
        });

        it("with maxPending 1, should not create next awaitable when first rejects", async () => {
            const argument = [
                async () => await Promise.reject(new Error("Boom!")),
                () => { throw new Error("This should not happen..."); },
            ] as const;

            try {
                await CappedPromise.all(1, argument);
            } catch (error) {
                assert(error instanceof Error);
                assert(error.message === "Boom!");
            }
        });

        it("with maxPending 2, should attempt to create both awaitables", async () => {
            const argument = [
                async () => await Promise.reject(new Error("This should not happen...")),
                () => { throw new Error("Boom!"); },
            ] as const;

            try {
                await CappedPromise.all(2, argument);
            } catch (error) {
                assert(error instanceof Error);
                assert(error.message === "Boom!");
            }
        });
    });

    describe("allSettled", () => {
        it("should correctly infer the types for tuples", async () => {
            const argument = [
                async () => await Promise.resolve(1),
                async () => await Promise.resolve("hello"),
            ] as const;

            const [result0, result1]: [PromiseSettledResult<number>, PromiseSettledResult<string>] =
                await CappedPromise.allSettled(5, argument);

            assert((result0.status === "fulfilled" ? result0.value : undefined) === 1);
            assert((result1.status === "fulfilled" ? result1.value : undefined) === "hello");
        });

        it("should correctly infer the types for iterables", async () => {
            const [result0, result1]: Array<PromiseSettledResult<number>> =
                await CappedPromise.allSettled(5, iterable());

            assert((result0?.status === "fulfilled" ? result0.value : undefined) === 1);
            assert((result1?.status === "fulfilled" ? result1.value : undefined) === 2);
        });

        it("should only create new awaitables when all previous ones are pending or settled", async () => {
            const states = new Array<State>(5).fill("init");

            const argument = states.map((_, index, array) => (
                async () => {
                    // Previous awaitables must be pending or settled
                    assert(array.findIndex((state) => state !== "pending" && state !== "settled") === index);
                    // Next awaitables must be in initial state
                    assert(array.slice(index).findIndex((state) => state !== "init") === -1);
                    const promise = Promise.resolve(index);
                    array[index] = "pending";

                    try {
                        return await promise;
                    } finally {
                        // eslint-disable-next-line require-atomic-updates
                        array[index] = "settled";
                    }
                }
            ));

            const results = await CappedPromise.allSettled(3, argument);

            for (const [index, value] of results.entries()) {
                assert((value.status === "fulfilled" ? value.value : undefined) === index);
            }
        });

        it("should fulfill with empty array if passed empty array", async () => {
            assert((await CappedPromise.allSettled(5, [])).length === 0);
        });

        it("results should be added in the awaitable creation order", async () => {
            const argument = [
                async () => await delay(300, 0),
                async () => await delay(200, 1),
                async () => await delay(100, 2),
            ] as const;

            const results = await CappedPromise.allSettled(3, argument);

            for (const [index, value] of results.entries()) {
                assert((value.status === "fulfilled" ? value.value : undefined) === index);
            }
        });

        it("should reject for invalid maxPending", async () => {
            try {
                await CappedPromise.allSettled(0, []);
            } catch (error) {
                assert(error instanceof RangeError);
                assert(error.message === "maxPending is invalid: 0.");
            }
        });

        it("should reject for non-functions", async () => {
            const createAwaitable = 42 as unknown as () => Promise<number>;

            try {
                await CappedPromise.allSettled(5, [createAwaitable]);
            } catch (error) {
                assert(error instanceof TypeError);
                assert(error.message === "createAwaitable is not a function: 42.");
            }
        });

        it("with maxPending 1, should reject with error thrown by second createAwaitable", async () => {
            const argument = [
                async () => await Promise.reject(new Error("This should not happen...")),
                () => { throw new Error("Boom!"); },
            ] as const;

            try {
                await CappedPromise.allSettled(1, argument);
            } catch (error) {
                assert(error instanceof Error);
                assert(error.message === "Boom!");
            }
        });

        it("with maxPending 2, should reject with error thrown from first createAwaitable", async () => {
            const argument = [
                () => { throw new Error("Boom!"); },
                async () => await Promise.reject(new Error("This should not happen...")),
            ] as const;

            try {
                await CappedPromise.allSettled(2, argument);
            } catch (error) {
                assert(error instanceof Error);
                assert(error.message === "Boom!");
            }
        });
    });
});
