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
});
