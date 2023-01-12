// https://github.com/andreashuber69/capped-promise#--
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import CappedPromise from "./CappedPromise";

use(chaiAsPromised);

const iterable = function *iterable() {
    yield async () => await Promise.resolve(1);
    yield async () => await Promise.resolve(2);
};

type State = "created" | "init" | "pending" | "resolved";

describe("CappedPromise", () => {
    describe("constructor", () => {
        it("should throw for invalid options", () => {
            expect(() => new CappedPromise({ cap: 0 })).to.throw(
                RangeError,
                "options.cap is invalid: 0.",
            );
        });
    });
    describe("cap", () => {
        it("should be equal to the default", () => {
            expect(new CappedPromise().cap).to.equal(5);
        });
        it("should be equal to options.cap", () => {
            expect(new CappedPromise({ cap: 42 }).cap).to.equal(42);
        });
    });
    describe("all", () => {
        it("should correctly infer the types for tuples", async () => {
            const sut = new CappedPromise();

            const argument = [
                async () => await Promise.resolve(1),
                async () => await Promise.resolve("hello"),
            ] as const;

            const [result0, result1]: [number, string] = await sut.all(argument);

            expect(result0).to.equal(1);
            expect(result1).to.equal("hello");
        });

        it("should correctly infer the types for iterables", async () => {
            const sut = new CappedPromise();

            const [result0, result1]: number[] = await sut.all(iterable());

            expect(result0).to.equal(1);
            expect(result1).to.equal(2);
        });

        it("should only create new awaitables when all previous ones have been resolved", async () => {
            const sut = new CappedPromise({ cap: 1 });
            const states = new Array<State>(5).fill("init");

            const argument = states.map((_, index, array) => (
                async () => {
                    // Previous awaitables must be resolved
                    expect(array.findIndex((state) => state !== "resolved")).to.equal(index);
                    // Next awaitables must be in initial state
                    expect(array.slice(index).findIndex((state) => state !== "init")).to.equal(-1);
                    array[index] = "created";
                    const promise = Promise.resolve(index);
                    array[index] = "pending";
                    const result = await promise;
                    // eslint-disable-next-line require-atomic-updates
                    array[index] = "resolved";

                    return result;
                }
            ));

            const results = await sut.all(argument);

            for (const [index, value] of results.entries()) {
                expect(value).to.equal(index);
            }
        });

        it("should throw for non-functions", async () => {
            const sut = new CappedPromise();

            await expect(sut.all([42 as unknown as () => Promise<number>])).to.eventually.be.rejectedWith(
                TypeError,
                "createAwaitable is not a function: 42.",
            );
        });
    });
});
