#!/usr/bin/env bash
# 在已执行 git init + 首次 commit 后运行。需先：gh auth login
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_NAME="${1:-lizzardkevin-space}"

if ! command -v gh >/dev/null 2>&1; then
  echo "请先安装 GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "请先登录 GitHub:"
  echo "  gh auth login --hostname github.com --git-protocol https --web"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "已有 origin：$(git remote get-url origin)"
  if [[ "${2:-}" != "--push-existing" ]]; then
    echo "为避免误推已有远端，本脚本不会自动 push。"
    echo "确认当前分支和 main 后手动执行：git push -u origin main"
    echo "如确实要由脚本推送已有 origin，可运行：bash scripts/github-bootstrap.sh ${REPO_NAME} --push-existing"
    exit 1
  fi
  echo "确认参数 --push-existing，推送: git push -u origin main"
  git push -u origin main
  exit 0
fi

echo "创建公开仓库: ${REPO_NAME}"
gh repo create "${REPO_NAME}" --public --source=. --remote=origin --push
echo "完成: https://github.com/$(gh api user -q .login)/${REPO_NAME}"
