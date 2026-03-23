#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
HOOKS_ONLY="${1:-}"

install_dependencies() {
  cd "$SCRIPT_DIR"

  echo "Installing code quality dependencies..."
  pnpm add -D \
    prettier \
    husky \
    lint-staged \
    @commitlint/cli \
    @commitlint/config-conventional
}

install_husky() {
  cd "$REPO_ROOT"

  echo "Installing Husky hooks into $REPO_ROOT/.husky ..."
  node "$SCRIPT_DIR/node_modules/husky/bin.js" .husky
}

write_hook_files() {
  mkdir -p "$REPO_ROOT/.husky"

  cat <<'EOF' > "$REPO_ROOT/.husky/pre-commit"
#!/bin/sh
set -e

staged_files="$(git diff --cached --name-only --diff-filter=ACMR)"

if echo "$staged_files" | grep -q '^react-todo-app/'; then
  pnpm --dir react-todo-app exec lint-staged --relative
fi

if echo "$staged_files" | grep -q '^rag-test/'; then
  pnpm --dir rag-test exec lint-staged --relative
fi
EOF

  cat <<'EOF' > "$REPO_ROOT/.husky/commit-msg"
#!/bin/sh
set -e

if [ -f rag-test/commitlint.config.cjs ]; then
  pnpm --dir rag-test exec commitlint --config commitlint.config.cjs --edit "$1"
  exit 0
fi

if [ -f react-todo-app/commitlint.config.cjs ]; then
  pnpm --dir react-todo-app exec commitlint --config commitlint.config.cjs --edit "$1"
  exit 0
fi

echo "commitlint config not found"
exit 1
EOF

  chmod +x "$REPO_ROOT/.husky/pre-commit" "$REPO_ROOT/.husky/commit-msg"
}

if [[ "$HOOKS_ONLY" != "--hooks-only" ]]; then
  install_dependencies
fi

install_husky
write_hook_files

echo "Code quality workflow is ready."
