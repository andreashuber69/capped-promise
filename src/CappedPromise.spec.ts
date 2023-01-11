// https://github.com/andreashuber69/capped-promise#--
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import CappedPromise from "./CappedPromise";

use(chaiAsPromised);

const iterable = function *iterable() {
    yield async () => await Promise.resolve(1);
    yield async () => await Promise.resolve(2);
};

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

        it("should throw for non-functions", async () => {
            const sut = new CappedPromise();

            await expect(sut.all([42 as unknown as () => Promise<number>])).to.eventually.be.rejectedWith(
                TypeError,
                "createAwaitable is not a function: 42.",
            );
        });
    });
});
