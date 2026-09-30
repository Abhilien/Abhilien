#!/usr/bin/env bash
#
# Move Aistro into a repository of its own.
#
# The project currently lives on a branch of Abhilien/Abhilien, which is a
# GitHub *profile* repository: its root README.md renders on the profile page,
# so that file belongs to the profile and not to this product. Everything here
# is written to leave it exactly where it is.
#
# What this does:
#   1. pushes the current branch to the new repository as its main branch
#   2. replaces the profile README with the product one (docs/README.md)
#   3. pushes that single commit
#
# Nothing is touched in Abhilien/Abhilien. Run it once the empty repository
# exists — create it at https://github.com/new, no README, no .gitignore.
#
# Usage:  bash scripts/move-to-own-repo.sh [owner/repo]     (default Abhilien/aistro)

set -euo pipefail

TARGET="${1:-Abhilien/aistro}"
# A full URL is taken as-is, so this can be rehearsed against a local bare repo
# before it is pointed at GitHub.
case "${TARGET}" in
  *://*) REMOTE_URL="${TARGET}" ;;
  *)     REMOTE_URL="https://github.com/${TARGET}.git" ;;
esac
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash first." >&2
  exit 1
fi

if [ ! -f docs/README.md ]; then
  echo "docs/README.md is missing — that is the product README this swaps in." >&2
  exit 1
fi

echo "Moving ${BRANCH} → ${TARGET} (main)"

# A second remote, so `origin` keeps pointing at the profile repository and no
# habit of typing `git push` can send anything to the wrong place.
git remote remove aistro 2>/dev/null || true
git remote add aistro "${REMOTE_URL}"

git push aistro "${BRANCH}:main"

# The README swap is its own commit on a branch that only ever exists in the new
# repository, so the profile README is never rewritten in its own history.
git checkout -B aistro-main
git mv docs/README.md README.md -f
rmdir docs 2>/dev/null || true
git commit -q -m "Make the product README the front page

The root README.md carried over from Abhilien/Abhilien, where it renders on
the GitHub profile. In a repository of its own, the front page should be the
product."
git push aistro aistro-main:main

git checkout "${BRANCH}"

cat <<EOF

Done. ${REMOTE_URL%.git}

Two things left, both in the repository's settings:
  - set the default branch to main, if it is not already
  - Settings → Pages → Source → GitHub Actions, to use .github/workflows/deploy.yml

The local branch 'aistro-main' is the state that was pushed; delete it when you
no longer need it. 'origin' still points at Abhilien/Abhilien and is unchanged.
EOF
