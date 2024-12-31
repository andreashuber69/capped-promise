import generalConfig from "@andreashuber69/eslint-config";

const config = [
    ...generalConfig,
    {
        files: ["./src/*.ts"],
    },
    {
        ignores: ["coverage/", "dist/"],
    },
];

// eslint-disable-next-line import/no-default-export
export default config;
