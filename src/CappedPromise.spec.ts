// https://github.com/andreashuber69/capped-promise#--
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import CappedPromise from "./CappedPromise";

use(chaiAsPromised);

const iterable = function *iterable() {
    yield async () => await Promise.resolve(1);
    yield async () => await Promise.resolve(2);
};

type State = "init" | "pending" | "settled";

describe("CappedPromise", () => {
    describe("all", () => {
        it("should correctly infer the types for tuples", async () => {
            const argument = [
                async () => await Promise.resolve(1),
                async () => await Promise.resolve("hello"),
            ] as const;

            const [result0, result1]: [number, string] = await CappedPromise.all(5, argument);

            expect(result0).to.equal(1);
            expect(result1).to.equal("hello");
        });

        it("should correctly infer the types for iterables", async () => {
            const [result0, result1]: number[] = await CappedPromise.all(5, iterable());

            expect(result0).to.equal(1);
            expect(result1).to.equal(2);
        });

        it("should only create new awaitables when all previous ones are pending or settled", async () => {
            const states = new Array<State>(5).fill("init");

            const argument = states.map((_, index, array) => (
                async () => {
                    // Previous awaitables must be pending or settled
                    expect(array.findIndex((state) => state !== "pending" && state !== "settled")).to.equal(index);
                    // Next awaitables must be in initial state
                    expect(array.slice(index).findIndex((state) => state !== "init")).to.equal(-1);
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
                expect(value).to.equal(index);
            }
        });

        it("should fulfill with empty array if passed empty array", async () => {
            expect((await CappedPromise.all(5, [])).length).to.equal(0);
        });

        it("should reject for invalid maxPending", async () => {
            await expect(CappedPromise.all(0, [])).to.eventually.be.rejectedWith(
                RangeError,
                "maxPending is invalid: 0.",
            );
        });

        it("should reject for non-functions", async () => {
            await expect(CappedPromise.all(5, [42 as unknown as () => Promise<number>])).to.eventually.be.rejectedWith(
                TypeError,
                "createAwaitable is not a function: 42.",
            );
        });

        it("with maxPending 1, should not create next awaitable when first rejects", async () => {
            const argument = [
                async () => await Promise.reject(new Error("Boom!")),
                () => { throw new Error("This should not happen..."); },
            ] as const;

            await expect(CappedPromise.all(1, argument)).to.eventually.be.rejectedWith(Error, "Boom!");
        });

        it("with maxPending 2, should attempt to create both awaitables", async () => {
            const argument = [
                async () => await Promise.reject(new Error("This should not happen...")),
                () => { throw new Error("Boom!"); },
            ] as const;

            await expect(CappedPromise.all(2, argument)).to.eventually.be.rejectedWith(Error, "Boom!");
        });
    });
});
