module.exports = {
    extends: [
        '@semivan/eslint-config-ts',
    ],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
    },
    rules: {},
};
