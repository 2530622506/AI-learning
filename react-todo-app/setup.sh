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
    eslint-config-prettier \
    eslint-plugin-prettier \
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
pnpm --dir react-todo-app exec lint-staged
EOF

  cat <<'EOF' > "$REPO_ROOT/.husky/commit-msg"
pnpm --dir react-todo-app exec commitlint --config commitlint.config.cjs --edit "$1"
EOF

  chmod +x "$REPO_ROOT/.husky/pre-commit" "$REPO_ROOT/.husky/commit-msg"
}

if [[ "$HOOKS_ONLY" != "--hooks-only" ]]; then
  install_dependencies
fi

install_husky
write_hook_files

echo "Code quality workflow is ready."
