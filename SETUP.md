# 遙感探測 — 特徵強化實習闖關 部署說明

## 📦 檔案說明

```
遙感探測_特徵強化實習/
├─ index.html      ← 主檔案：闖關系統（給學生雙擊用）
├─ lab.html        ← 練習園地：自由探索（學生破關前後都可玩）
├─ core.js         ← 共用工具函式（色彩轉換、形態學、濾波）
├─ levels.js       ← 5 關挑戰題目的實作
├─ Code.gs         ← Google Apps Script 程式碼（已自動貼到你的 Apps Script）
├─ assets/         ← 多光譜 + RGB + 動漫圖
└─ SETUP.md        ← 本檔
```

## 🎯 給學生：怎麼用

1. **雙擊 `index.html`** → 用 Chrome 或 Edge 打開
2. 在報到頁輸入學號 + 姓名 → 開始闖關
3. 依序通關 L1 ~ L5（每關過了才解鎖下一關）
4. 全部通關後按「提交結業」
5. 想自由玩耍？右上角點「🎮 練習園地」

學生的進度會自動存在瀏覽器 localStorage（換電腦會重置），同時上傳到 Google Sheet（若老師已設定）。

## 🛠️ 給老師：第一次部署（只需做一次，3 分鐘）

### Step 1：開啟 Apps Script
1. 開啟你的試算表：<https://docs.google.com/spreadsheets/d/1LCFuZBRTuY87wTYO_GYJsyXnqFCE-es7LObI-VkL6tQ/edit>
2. 上方功能表 → `擴充功能` → `Apps Script`
3. 你會看到名為「RS_FeatureEnhancement_Quest」的專案，**程式碼已經貼好**（我預先放好了）

### Step 2：部署成 Web App
1. 右上角藍色按鈕 `部署` → `新增部署作業`
2. 左上角齒輪 ⚙️ → 選 `網頁應用程式`
3. 填寫：
   - **說明**：隨便填，例如「v1」
   - **執行身分**：`我（你的 email）`
   - **誰可以存取**：`任何人` ← 重要！否則學生無法呼叫
4. 按 `部署`

### Step 3：第一次授權
1. 跳出「需要授權」 → 按 `授權存取權`
2. 選你自己的 Google 帳號
3. 出現「Google 尚未驗證這個應用程式」警告 → 按左下角 `進階`
4. 按 `前往 RS_FeatureEnhancement_Quest（不安全）` （不用怕，是你自己的腳本）
5. 滾到最下面 → 按 `允許`

### Step 4：複製 URL 並貼回 HTML
1. 部署完成後會出現「網頁應用程式 URL」，類似：
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
2. **複製這個 URL**
3. 打開 `index.html` → 右上角點「⚙️ 設定」
4. 把 URL 貼到「Google Sheet Web App URL」欄位 → 按 `💾 儲存`
5. 按 `🔬 測試連線` 確認顯示「✓ 連線成功」

### Step 5：發布給學生
方式一（簡單）：
- 把整個 `遙感探測_特徵強化實習` 資料夾壓縮成 zip → 上傳到 Google Classroom 或網路硬碟
- 學生下載解壓 → 雙擊 `index.html`
- **學生需要去設定頁手動貼一次 URL**（或你可以幫他們改好 `index.html` 預設值）

方式二（一鍵 URL）：
- 預設 URL 寫死在 HTML 裡。打開 `index.html`，找到這一行（約第 410 行）：
  ```js
  webAppUrl: null,
  ```
  改成：
  ```js
  webAppUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
  ```
- 學生下載即用，無須設定

方式三（線上部署）：
- 用 GitHub Pages 或 Netlify 把整個資料夾發布成網站
- 給學生網址即可，不用下載任何東西

## 📊 觀看排行榜

- 學生端：點 HTML 上方「🏅 排行榜」按鈕
- 老師端：直接看 Google 試算表的 `Progress` 工作表
  - 完成者依「TotalSeconds」排序看誰最快
  - 未完成者可以看到目前進度到第幾關

## 🔧 常見問題

**Q：學生看到「載入失敗」**
A：他們用 `file://` 直接打開時，Chrome/Edge 應該都能正常運作。若用 Firefox 可能 CORS 嚴格，建議改用 Chrome。

**Q：學生點「測試連線」失敗**
A：通常是「存取權」沒設為「任何人」。重新部署時把這個改正就好（要產生新 URL）。

**Q：學生卡關過不去**
A：每關都有提示（黃色提示框）。L3 提示 `thresh ≈ 110、5×5 圓形、先開後閉`；L4 提示是 Sobel-Y。如果還是卡，老師可以幫忙在練習園地讓他們先理解概念。

**Q：要不要改成可重複作答？**
A：目前設計是「過了就過了」（同一關卡不會重複算分）。若要重置，學生在「⚙️ 設定」可以「清空本機進度」重新報到。但 Sheet 上的紀錄會被覆蓋（同學號的 row 會更新成新的 startTime）。

**Q：可以改題目嗎？**
A：可以！題目都在 `levels.js`。每關有 `theory`（說明）、`goal`（題目）、`render`（UI）、判定函式。把判定的數值改一改就能調整難度。

## 🎓 推薦時間

各關平均完成時間：
- L1 植生指標：3–5 分鐘
- L2 色彩空間：3–5 分鐘  
- L3 形態學：5–8 分鐘
- L4 濾波器：3–5 分鐘
- L5 HSL 配色：2–4 分鐘
- **總計：15–25 分鐘** 適合一節 50 分鐘課的後半段

## 🙏 致謝

- 多光譜資料：DJI P4 Multispectral
- 動漫圖：《葬送的芙莉蓮》（教學用途）
- 全部運算純前端，不需後端伺服器
