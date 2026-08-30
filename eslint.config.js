// Lint enforces both code quality and the architectural layering rules from
// docs/specs/010-architecture.md: cli -> pipeline -> core, and core imports
// neither. Changing a boundary here requires updating that spec.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', '.claude/hooks/**/*.mjs'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'off',
    },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // cli.js matters too: the CLI entry is a file, not a directory,
              // so a directory-only glob never binds it (found by self-assessment).
              group: ['**/pipeline/**', '**/cli/**', '**/cli.js'],
              message: 'core must not import pipeline or cli (spec 010 layering)',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/pipeline/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/cli/**', '**/cli.js'], message: 'pipeline must not import cli (spec 010 layering)' },
          ],
        },
      ],
    },
  },
);
