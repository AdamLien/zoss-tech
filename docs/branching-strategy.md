# Git Branching Strategy

本專案採用三線開發：

```text
feature/* → develop → main
```

## 分支責任

### `feature/*`

單一功能、修正或 UAT 工作。每個工作建立獨立分支，例如：

- `feature/uat-privacy-policy`
- `feature/uat-liff-config`
- `feature/uat-webhook`
- `feature/uat-redeem-flow`

完成後提交 Pull Request 到 `develop`。

### `develop`

整合測試分支。所有 UAT 功能先在這裡合併、部署與驗證；只有通過 UAT 才能進入 `main`。

### `main`

可發布分支。只接受已在 `develop` 完成驗收的變更，不直接在 `main` 編輯檔案。

## GitHub 操作規則

1. 不直接 push 到 `main`。
2. `feature/*` → Pull Request → `develop`。
3. `develop` 完成 UAT 後 → Pull Request → `main`。
4. GitHub Pages 的 UAT 可由 `develop` 或 UAT 專用部署來源發布；正式 Pages 才使用 `main`。
5. LINE LIFF、Messaging API Webhook、Apps Script `sid` 必須在分支／環境文件中標示為 UAT 或正式，不可混用。
6. Pull Request 不得包含 token、Channel Secret、OAuth code、完整員工名單或未遮罩的身分證號。

## 本機目前分支

- `main`：目前既有基準與 Privacy Policy commit
- `develop`：UAT 整合分支
- `feature/uat-branching`：本次分支策略文件

GitHub 遠端分支需在登入後首次 push 建立。
