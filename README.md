<h1 align="center">
  <img width="128" src="https://raw.githubusercontent.com/andreashuber69/capped-promise/develop/doc/icon.svg?sanitize=true"><br>
  capped-promise
</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/capped-promise">
    <img src="https://img.shields.io/npm/v/capped-promise" alt="NPM Version">
  </a>
  <a href="https://github.com/andreashuber69/capped-promise/releases/latest">
    <img src="https://img.shields.io/github/release-date/andreashuber69/capped-promise.svg" alt="Release Date">
  </a>
  <a href="https://travis-ci.com/github/andreashuber69/capped-promise">
    <img src="https://travis-ci.com/andreashuber69/capped-promise.svg?branch=master" alt="Build">
  </a>
  <a href="https://github.com/andreashuber69/capped-promise/issues">
    <img src="https://img.shields.io/github/issues-raw/andreashuber69/capped-promise.svg" alt="Issues">
  </a>
  <a href="https://codeclimate.com/github/andreashuber69/capped-promise/maintainability">
    <img src="https://api.codeclimate.com/v1/badges/10eb936245c62547a163/maintainability" alt="Code Climate Maintainability">
  </a>
  <a href="https://codeclimate.com/github/andreashuber69/capped-promise/test_coverage">
    <img src="https://api.codeclimate.com/v1/badges/10eb936245c62547a163/test_coverage" alt="Code Climate Test Coverage">
  </a>
  <a href="https://github.com/andreashuber69/capped-promise/blob/develop/LICENSE">
    <img src="https://img.shields.io/github/license/andreashuber69/capped-promise.svg" alt="License">
  </a>
</p>

Provides `Promise.all` and `Promise.allSettled` variants that allow to cap the number of simultaneously pending
promises. This is useful e.g. when you need to make thousands of requests to a single server but do not want to hit it
with all requests at once. Instead you might want to have at most 10 requests pending simultaneously and whenever one
settles, the next one is initiated automatically.

This is a ES2019 CommonJS module, that works exactly the same way in CommonJS and ES modules (because there's only an
unnamed default export). TypeScript typings are provided.

## Installation

`npm install capped-promise`

## Example

```ts
// Only necessary in node, fetch is natively available in a browser.
import fetch from "node-fetch";
import CappedPromise from "capped-promise";

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
```

## Interface

`Promise.all` and `Promise.allSettled` accept iterables of awaitables (usually promises). By its very nature, once a
promise has been created, it is in the state *pending*. That is, the underlying operation is already running. So, if you
create e.g. 1000 `Promise` objects by calling [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/fetch)
repeatedly (without `await`ing them), all those requests will be made quasi simultaneously, if you pass them to
`Promise.all` and then `await` the result. This is why `CappedPromise.all` and `CappedPromise.allSettled` differ from
their `Promise` counterparts as follows:

- Instead of awaitables, they accept parameterless functions that are expected to create and return awaitables. The
  `CappedPromise` implementation will then call these functions to create new awaitables as necessary.
- The first parameter is `maxPending`, which specifies how many promises can at most be pending simultaneously.

Otherwise, `CappedPromise.all` and `CappedPromise.allSettled` follow their `Promise` counterparts.

## Behavior

Again, the `CappedPromise` behavior follows the `Promise` behavior as much as possible. However, due to the different
interface there is the following additional concern: If a function passed to a `CappedPromise` method throws right away,
e.g. `() => { throw new Error("Oops!"); }` then this is treated as an unintended catastrophic failure and is propagated
as a rejection immediately, **even if** the function was passed to `allSettled`. If this is not what you expect, you
should return a rejecting `Promise`, as follows: `() => Promise.reject(new Error("Oops!"))`.
