import semivanTsEslintConfig from '@semivan/eslint-config-ts';

export default [
    ...semivanTsEslintConfig(),
    {
        ignores: ['**/dist/**'],
    },
    {
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
];
