/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Types allowed for this project
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new feature
        'fix',      // bug fix
        'chore',    // maintenance, deps, tooling
        'docs',     // documentation only
        'style',    // formatting, DaisyUI/CSS changes
        'refactor', // code change that's not a fix or feature
        'test',     // adding or updating tests
        'ci',       // CI/CD changes
        'revert',   // revert a previous commit
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
