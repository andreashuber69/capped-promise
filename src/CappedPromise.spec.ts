// https://github.com/andreashuber69/capped-promise#--
import { expect } from "chai";

import CappedPromise from "./CappedPromise";

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
        it("should call each Promise-returning function, await and return the results", async () => {
            const sut = new CappedPromise();

            const argument =
                [async () => await Promise.resolve(1), async () => await Promise.resolve("hello")] as const;

            const result = await sut.all(argument);

            expect(result[0]).to.equal(1);
            expect(result[1]).to.equal("hello");
        });
    });
});
