// ============================================================
// CNN 闖關 4 關定義（已移除原 L3 Tiny CNN，剩 Kernel / Pool 計算 / 分類 / 偵測）
// ============================================================

function defineLevels() {
  LEVEL_DEFS.push(LEVEL_1, LEVEL_2, LEVEL_4, LEVEL_5);
}

// ============================================================
// 共用：產生測試用合成影像 (64x64 灰階)
// ============================================================
function makeTestImage(w, h, kind) {
  const arr = new Float32Array(w * h);
  if (kind === 'shapes') {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) arr[y*w+x] = 40;  // 灰底
    // 圓
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x-16)*(x-16) + (y-22)*(y-22));
      if (d <= 10) arr[y*w+x] = 220;
    }
    // 方塊
    for (let y = 36; y < 52; y++) for (let x = 36; x < 56; x++) arr[y*w+x] = 200;
    // 水平條
    for (let y = 8; y < 12; y++) for (let x = 38; x < 60; x++) arr[y*w+x] = 240;
    // 對角線
    for (let i = 0; i < 30; i++) { const x = 12+i, y = 36+i; if (x<w && y<h) arr[y*w+x] = 250; }
  } else if (kind === 'digit') {
    for (let i = 0; i < arr.length; i++) arr[i] = 20;
    // 畫個粗略的 X
    for (let i = 0; i < 50; i++) {
      const t = i/50;
      const x1 = Math.floor(10 + t*44), y1 = Math.floor(10 + t*44);
      const x2 = Math.floor(54 - t*44), y2 = Math.floor(10 + t*44);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (x1+dx>=0 && x1+dx<w && y1+dy>=0 && y1+dy<h) arr[(y1+dy)*w + (x1+dx)] = 240;
        if (x2+dx>=0 && x2+dx<w && y2+dy>=0 && y2+dy<h) arr[(y2+dy)*w + (x2+dx)] = 240;
      }
    }
  }
  return arr;
}

// ============================================================
// L1 — Kernel 與卷積
// ============================================================
const LEVEL_1 = {
  icon: '🟦',
  title: 'Kernel & 卷積',
  passThreshold: 65,
  theory: `
    <p><strong>卷積（Convolution）</strong>是 CNN 的基礎運算：用一個小型矩陣（<strong>kernel</strong> / 濾波核）在影像上「滑動」，每個位置都計算 kernel 與該位置周圍像素的<strong>加權總和</strong>，作為輸出像素。</p>
    <p>例如 3×3 kernel：</p>
    <pre style="background:#0a0a18;padding:10px;border-radius:4px;color:#c5b6db;font-size:13px;line-height:1.4">
output[y,x] = Σ Σ  input[y+i, x+j] × kernel[i,j]
              i j

最後再除以 divisor、加上 bias：
output[y,x] = (Σ Σ ...) / divisor + bias</pre>
    <p><strong>不同的 kernel = 不同的特徵偵測器</strong>：</p>
    <ul style="font-size:13px">
      <li>邊緣偵測（Sobel-X 偵測垂直邊、Sobel-Y 偵測水平邊）</li>
      <li>模糊（均值、高斯）</li>
      <li>銳化、浮雕、Laplacian……</li>
    </ul>
    <p>CNN 的厲害之處在於：<strong>kernel 不是手工設計的，而是透過資料訓練「學」出來的</strong>。</p>
  `,
  goal: `🎯 設計一個 <strong>3×3 卷積核</strong>，讓你的輸出 feature map 匹配右邊的目標。
         <br>填 9 個 kernel 值 + divisor + bias，按提交看分數。`,
  render: function() {
    const body = document.getElementById('challengeBody');
    const W = 48, H = 48;
    const input = makeTestImage(W, H, 'shapes');
    // 目標：Sobel-Y（水平邊緣偵測）
    const targetKernel = [-1,-2,-1, 0,0,0, 1,2,1];
    const targetOut = convolve2d(input, W, H, targetKernel, 3, 1, 128);
    window._L1 = { W, H, input, target: targetOut };

    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>1. 設計你的 3×3 卷積核</h4>
          <div class="kernel-grid" id="L1KGrid">
            ${[0,1,2,3,4,5,6,7,8].map(i => `<input type="number" step="any" value="0" id="L1K${i}">`).join('')}
          </div>
          <div class="control-row" style="margin-top:14px">
            <label>Divisor 除數 <span class="value" id="L1DivV">1</span></label>
            <input type="range" id="L1Div" min="1" max="50" value="1">
          </div>
          <div class="control-row">
            <label>Bias 偏移 <span class="value" id="L1BiasV">0</span></label>
            <input type="range" id="L1Bias" min="-128" max="255" value="0">
          </div>
          <button class="btn" onclick="L1Compute()" style="width:100%">▶ 計算我的 feature map</button>
          <button class="btn" onclick="L1PlayScan()" style="width:100%;background:#5c4ab8;margin-top:6px">🎬 卷積掃描動畫</button>
          ${renderSubmitArea(1, true)}
        </div>
        <div>
          <div class="split-view-3">
            <div>
              <div class="canvas-wrap"><canvas id="L1Input" width="${W}" height="${H}" style="width:160px;height:160px"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8a8aa5;margin-top:4px">輸入影像 (${W}×${H})</div>
            </div>
            <div>
              <div class="canvas-wrap" style="position:relative">
                <canvas id="L1Out" width="${W}" height="${H}" style="width:160px;height:160px"></canvas>
                <canvas id="L1Overlay" width="${W}" height="${H}" style="position:absolute;left:8px;top:8px;width:160px;height:160px;pointer-events:none"></canvas>
              </div>
              <div style="text-align:center;font-size:12px;color:#8a8aa5;margin-top:4px">你的輸出</div>
            </div>
            <div>
              <div class="canvas-wrap"><canvas id="L1Tgt" width="${W}" height="${H}" style="width:160px;height:160px"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8a8aa5;margin-top:4px">目標</div>
            </div>
          </div>
          <div id="L1CalcDisplay" style="margin-top:10px;font-family:Consolas,monospace;font-size:11px;color:#c5b6db;min-height:18px;text-align:center"></div>
        </div>
      </div>`;
    // 畫輸入與目標
    const ci = document.getElementById('L1Input');
    ci.getContext('2d').putImageData(floatToImageData(input, W, H, 0, 255), 0, 0);
    const ct = document.getElementById('L1Tgt');
    ct.getContext('2d').putImageData(floatToImageData(targetOut, W, H, 0, 255), 0, 0);
    // 滑桿 listener
    document.getElementById('L1Div').addEventListener('input', e => { document.getElementById('L1DivV').textContent = e.target.value; L1Compute(); });
    document.getElementById('L1Bias').addEventListener('input', e => { document.getElementById('L1BiasV').textContent = e.target.value; L1Compute(); });
    for (let i = 0; i < 9; i++) document.getElementById('L1K' + i).addEventListener('change', L1Compute);
    L1Compute();
  },
  computeScore: function() { return window._L1score || 0; }
};

function L1Compute() {
  const { W, H, input, target } = window._L1;
  const kernel = [];
  for (let i = 0; i < 9; i++) { const v = parseFloat(document.getElementById('L1K' + i).value); kernel.push(isNaN(v) ? 0 : v); }
  const div = parseInt(document.getElementById('L1Div').value) || 1;
  const bias = parseInt(document.getElementById('L1Bias').value) || 0;
  const out = convolve2d(input, W, H, kernel, 3, div, bias);
  window._L1out = out; window._L1kernel = kernel; window._L1div = div; window._L1bias = bias;
  document.getElementById('L1Out').getContext('2d').putImageData(floatToImageData(out, W, H, 0, 255), 0, 0);
  window._L1score = Math.round(similarity(out, target) * 100);
  updateLiveScore(1);
}

async function L1PlayScan() {
  const { W, H, input } = window._L1;
  if (!window._L1out) L1Compute();
  const out = window._L1out, kernel = window._L1kernel;
  const ov = document.getElementById('L1Overlay');
  const octx = ov.getContext('2d');
  const calc = document.getElementById('L1CalcDisplay');
  const scale = 160 / W;  // CSS scale
  // 漸進顯示輸出（先全黑）
  const blank = new ImageData(W, H);
  for (let i = 0; i < blank.data.length; i += 4) { blank.data[i+3] = 255; }
  document.getElementById('L1Out').getContext('2d').putImageData(blank, 0, 0);
  const step = 2;
  for (let y = 1; y < H-1; y += step) {
    for (let x = 1; x < W-1; x += step) {
      // 高亮目前 3×3 視窗
      octx.clearRect(0, 0, W, H);
      octx.strokeStyle = '#ffeb3b'; octx.lineWidth = 0.7;
      octx.strokeRect(x-1.5, y-1.5, 3, 3);
      octx.fillStyle = 'rgba(255,235,59,0.25)'; octx.fillRect(x-1.5, y-1.5, 3, 3);
      // 漸進填充輸出（step×step 區塊）
      const part = new ImageData(step+1, step+1);
      for (let dy = 0; dy <= step; dy++) for (let dx = 0; dx <= step; dx++) {
        if (y+dy < H && x+dx < W) {
          const v = clip255(out[(y+dy)*W + (x+dx)]);
          const i = (dy*(step+1) + dx) * 4;
          part.data[i] = v; part.data[i+1] = v; part.data[i+2] = v; part.data[i+3] = 255;
        }
      }
      document.getElementById('L1Out').getContext('2d').putImageData(part, x, y);
      // 顯示計算
      const v = clip255(out[y*W+x]);
      calc.textContent = `(${x},${y}) → Σ(像素 × 核值) / ${window._L1div} + ${window._L1bias} = ${v}`;
      await sleep(10);
    }
  }
  octx.clearRect(0, 0, W, H);
  L1Compute();  // 重畫完整輸出
  calc.textContent = '✓ 掃描完成';
}

// ============================================================
// L2 — 多 Kernel + Pooling
// ============================================================
const FIXED_KERNELS_L2 = {
  '垂直邊緣 (Sobel-X)': [-1,0,1,-2,0,2,-1,0,1],
  '水平邊緣 (Sobel-Y)': [-1,-2,-1,0,0,0,1,2,1],
  '均值模糊': [1,1,1,1,1,1,1,1,1],
  '銳化': [0,-1,0,-1,5,-1,0,-1,0]
};
const LEVEL_2 = {
  icon: '🟧',
  title: '多 Kernel + Pooling',
  passThreshold: 65,
  theory: `
    <p>真實的 CNN 在一層中會用<strong>多個 kernel 並行</strong>，每個 kernel 提取不同特徵，產生多張 <strong>feature maps</strong>。</p>
    <p><strong>Pooling</strong>：降低 feature map 解析度，減少參數、增加抗位移性。</p>
    <ul style="font-size:13px">
      <li><strong>Max Pooling</strong>：取區域內最大值（最常用）</li>
      <li><strong>Average Pooling</strong>：取區域平均</li>
    </ul>
    <p><strong>輸出尺寸公式</strong>（卷積部分）：<br>
       <code>output_size = ⌊(input_size + 2*padding - kernel_size) / stride⌋ + 1</code></p>
    <p>例：input 28×28、kernel 3×3、stride 1、padding 0 → output = (28-3)/1 + 1 = 26</p>
  `,
  goal: `🎯 計算題：輸入 <strong>32×32</strong>，卷積 kernel <strong>5×5</strong>，stride=<strong>2</strong>，padding=<strong>1</strong>，
         接著 <strong>2×2 max pooling</strong>。請輸入最終 feature map 的<strong>邊長</strong>。
         <br><span style="font-size:11px;color:#8a8aa5">提示：先算卷積輸出尺寸，再除以 pooling 大小</span>`,
  render: function() {
    const body = document.getElementById('challengeBody');
    const W = 48, H = 48;
    const input = makeTestImage(W, H, 'shapes');
    window._L2 = { W, H, input };
    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>互動演示：多 Kernel 平行卷積</h4>
          <div class="control-row">
            <label>選擇 Kernel：</label>
            <select id="L2Kernel">${Object.keys(FIXED_KERNELS_L2).map(k => `<option value="${k}">${k}</option>`).join('')}</select>
          </div>
          <h4 style="margin-top:14px">Pooling</h4>
          <div class="control-row">
            <label>大小 <span class="value" id="L2PSV">2</span>×<span id="L2PSV2">2</span></label>
            <input type="range" id="L2PS" min="2" max="4" value="2">
          </div>
          <div class="control-row">
            <label>類型</label>
            <select id="L2PT"><option value="max">Max Pooling</option><option value="avg">Average Pooling</option></select>
          </div>
          <h4 style="margin-top:14px">📝 答題（最終邊長）</h4>
          <div style="font-size:12px;color:#c5b6db;margin-bottom:6px">輸入 32×32 → Conv(5×5, stride=2, padding=1) → Pool(2×2) = ?</div>
          <input type="number" id="L2Ans" placeholder="輸入一個整數" style="font-size:18px;text-align:center">
          ${renderSubmitArea(2, false)}
        </div>
        <div>
          <div class="split-view-3">
            <div><div class="canvas-wrap"><canvas id="L2In" width="${W}" height="${H}" style="width:140px;height:140px"></canvas></div><div style="text-align:center;font-size:11px;color:#8a8aa5">輸入</div></div>
            <div><div class="canvas-wrap"><canvas id="L2Conv" width="${W}" height="${H}" style="width:140px;height:140px"></canvas></div><div style="text-align:center;font-size:11px;color:#8a8aa5">卷積後</div></div>
            <div><div class="canvas-wrap"><canvas id="L2Pool" style="width:140px;height:140px"></canvas></div><div style="text-align:center;font-size:11px;color:#8a8aa5">Pooling 後 (<span id="L2PoolSize">—</span>)</div></div>
          </div>
        </div>
      </div>`;
    document.getElementById('L2In').getContext('2d').putImageData(floatToImageData(input, W, H, 0, 255), 0, 0);
    document.getElementById('L2Kernel').addEventListener('change', L2Compute);
    document.getElementById('L2PS').addEventListener('input', e => { document.getElementById('L2PSV').textContent = e.target.value; document.getElementById('L2PSV2').textContent = e.target.value; L2Compute(); });
    document.getElementById('L2PT').addEventListener('change', L2Compute);
    L2Compute();
  },
  computeScore: function() {
    // 輸入 32x32, kernel 5x5, stride 2, padding 1
    // conv output = floor((32 + 2*1 - 5)/2) + 1 = 15
    // pool 2x2: floor(15/2) = 7
    const ans = parseInt(document.getElementById('L2Ans').value);
    if (isNaN(ans)) return 0;
    const diff = Math.abs(ans - 7);
    if (diff === 0) return 100;
    if (diff === 1) return 75;  // 差 1 (例如忘了 floor) 還是給通關
    if (diff <= 3) return 40;
    return 0;
  }
};
function L2Compute() {
  const { W, H, input } = window._L2;
  const kname = document.getElementById('L2Kernel').value;
  const k = FIXED_KERNELS_L2[kname];
  const div = (kname === '均值模糊') ? 9 : 1;
  const bias = (kname.includes('邊緣')) ? 128 : 0;
  const conv = convolve2d(input, W, H, k, 3, div, bias);
  document.getElementById('L2Conv').getContext('2d').putImageData(floatToImageData(conv, W, H, 0, 255), 0, 0);
  const ps = parseInt(document.getElementById('L2PS').value);
  const pt = document.getElementById('L2PT').value;
  const pooled = pt === 'max' ? maxPool2d(conv, W, H, ps) : avgPool2d(conv, W, H, ps);
  const cp = document.getElementById('L2Pool');
  cp.width = pooled.w; cp.height = pooled.h;
  cp.getContext('2d').putImageData(floatToImageData(pooled.data, pooled.w, pooled.h, 0, 255), 0, 0);
  document.getElementById('L2PoolSize').textContent = `${pooled.w}×${pooled.h}`;
}


// ============================================================
// L4 — 影像分類 (TFJS MobileNet)
// ============================================================
const LEVEL_4 = {
  icon: '🤖',
  title: '影像分類 (TFJS)',
  passThreshold: 65,
  theory: `
    <p>這一關用 <strong>TensorFlow.js</strong> 載入 <strong>MobileNet v2</strong> — 一個已經訓練好、能辨識 1000 個類別的 CNN 模型。</p>
    <p>輸入一張圖 → 輸出每個類別的機率（前 5 名）。</p>
    <p style="color:#b89bdb">⏳ 首次載入需要 5–15 秒（從 CDN 下載 ~10 MB 模型）。耐心等待 ✨</p>
  `,
  goal: `🎯 從下面 6 張影像中，找出 <strong>MobileNet 預測前 5 名包含自然/植被/山景相關類別</strong>的那張。
         <br>點圖片做預測，看到符合的就提交。<span style="font-size:11px;color:#8a8aa5">（即使只是相關詞也給 70 分，能通關）</span>`,
  render: function() {
    const body = document.getElementById('challengeBody');
    body.innerHTML = `
      <div id="L4Status" style="text-align:center;padding:20px;background:#1a1a30;border-radius:8px;margin-bottom:14px">
        <div style="color:#c5b6db">⏳ 載入 TensorFlow.js + MobileNet（首次約 10 秒）...</div>
      </div>
      <div id="L4Body" style="display:none">
        <div class="layout">
          <div class="panel">
            <h4>選一張圖片做預測</h4>
            <div id="L4Gallery" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"></div>
            <div style="margin-top:14px;font-size:12px;color:#8a8aa5">點任一張看 MobileNet 預測前 5 名。挑到符合條件的圖再按提交。</div>
            ${renderSubmitArea(3, true)}
          </div>
          <div>
            <div class="canvas-wrap" style="min-height:240px"><canvas id="L4Canvas" width="224" height="224" style="width:224px;height:224px"></canvas></div>
            <div id="L4Preds" style="margin-top:14px"></div>
          </div>
        </div>
      </div>`;
    L4Init();
  },
  computeScore: function() { return window._L4score || 0; }
};
async function L4Init() {
  // 載入 TFJS + MobileNet
  if (typeof tf === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
  }
  if (typeof mobilenet === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js');
  }
  document.getElementById('L4Status').innerHTML = '<div style="color:#c5b6db">⏳ 下載模型 (~10 MB)...</div>';
  window._L4model = await mobilenet.load({ version: 2, alpha: 1.0 });
  document.getElementById('L4Status').style.display = 'none';
  document.getElementById('L4Body').style.display = 'block';
  // 產生 6 張內建測試圖（合成）
  const gallery = document.getElementById('L4Gallery');
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('canvas');
    c.width = 224; c.height = 224; c.style.cssText = 'width:100%;cursor:pointer;border-radius:4px;border:2px solid #3a2a4a';
    drawL4Scene(c, i);
    c.onclick = () => L4Predict(c, i);
    gallery.appendChild(c);
  }
}
function drawL4Scene(c, idx) {
  const ctx = c.getContext('2d'); const W = 224, H = 224;
  // 天空漸層
  const grad = ctx.createLinearGradient(0, 0, 0, H/2);
  grad.addColorStop(0, '#7ab8ff'); grad.addColorStop(1, '#e0f0ff');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H/2);
  ctx.fillStyle = '#5a9050'; ctx.fillRect(0, H/2, W, H/2);
  const scenes = ['mountain', 'forest', 'beach', 'house', 'flower', 'lake'];
  const s = scenes[idx];
  if (s === 'forest') {
    // 多顆樹
    for (const [tx, ty, r] of [[40,140,55],[100,130,70],[160,135,60],[200,140,50],[70,150,45]]) {
      ctx.fillStyle = '#3a6030'; ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#553a25'; ctx.fillRect(tx-5, ty, 10, 40);
    }
  } else if (s === 'mountain') {
    ctx.fillStyle = '#807070'; ctx.beginPath(); ctx.moveTo(20,160); ctx.lineTo(80,40); ctx.lineTo(140,160); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(110,160); ctx.lineTo(160,60); ctx.lineTo(210,160); ctx.closePath(); ctx.fill();
  } else if (s === 'beach') {
    ctx.fillStyle = '#f5e8a8'; ctx.fillRect(0, H/2, W, H/2);
    ctx.fillStyle = '#4a8db8'; ctx.fillRect(0, H/2, W, 40);
  } else if (s === 'house') {
    ctx.fillStyle = '#e8d8c0'; ctx.fillRect(70, 100, 100, 80);
    ctx.fillStyle = '#a04030'; ctx.beginPath(); ctx.moveTo(60,100); ctx.lineTo(120,50); ctx.lineTo(180,100); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#553a25'; ctx.fillRect(105, 140, 30, 40);
  } else if (s === 'flower') {
    for (let i = 0; i < 30; i++) {
      const x = Math.random()*W, y = H/2 + Math.random()*H/2;
      ctx.fillStyle = ['#ff5588','#ffaa44','#ffee44','#ee44ff'][i%4];
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill();
    }
  } else if (s === 'lake') {
    ctx.fillStyle = '#3a70a0'; ctx.fillRect(0, H/2, W, H/2);
    ctx.fillStyle = '#5a90c0'; for (let i = 0; i < 10; i++) ctx.fillRect(0, H/2+i*8, W, 3);
  }
}
async function L4Predict(canvas, idx) {
  document.getElementById('L4Preds').innerHTML = '<div style="color:#8a8aa5">⏳ 推論中...</div>';
  document.getElementById('L4Canvas').getContext('2d').drawImage(canvas, 0, 0);
  const preds = await window._L4model.classify(canvas);
  window._L4lastPreds = preds;
  window._L4lastIdx = idx;
  const html = preds.map((p, i) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
      <span style="width:24px;color:#b89bdb">${i+1}.</span>
      <span style="flex:1;font-size:13px">${p.className}</span>
      <div style="width:100px;background:#0f0f24;border-radius:3px;overflow:hidden;height:14px">
        <div style="width:${(p.probability*100).toFixed(0)}%;height:100%;background:#8a4ab8"></div>
      </div>
      <span style="width:50px;text-align:right;font-family:monospace;font-size:12px">${(p.probability*100).toFixed(1)}%</span>
    </div>`).join('');
  document.getElementById('L4Preds').innerHTML = `<h4 style="color:#b89bdb">Top-5 預測：</h4>${html}`;
  // 判定是否符合：放寬條件 — 信心 ≥ 0.05 而非 0.10，且接受更多自然類別字
  const matchesTopic = preds.some(p => /tree|forest|wood|pine|oak|maple|plant|leaf|park|lakeside|seashore|valley|alp|mountain|cliff|hill/i.test(p.className) && p.probability >= 0.05);
  const partial = preds.some(p => /tree|forest|wood|plant|leaf|park|alp|mountain/i.test(p.className));
  window._L4score = matchesTopic ? 100 : (partial ? 70 : 0);
  updateLiveScore(3);
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
}

// ============================================================
// L5 — 物件偵測 + IoU 評估
// ============================================================
const LEVEL_5 = {
  icon: '🎯',
  title: '物件偵測 + IoU',
  passThreshold: 65,
  theory: `
    <p><strong>物件偵測</strong>：不只說「圖中有狗」，還要框出位置（bounding box）並標記類別。常見模型：COCO-SSD、YOLO、Faster R-CNN。</p>
    <p><strong>IoU (Intersection over Union)</strong>：兩個 bbox 的重疊程度。</p>
    <pre style="background:#0a0a18;padding:10px;border-radius:4px;color:#c5b6db;font-size:13px">IoU = 交集面積 / 聯集面積

IoU = 0    → 完全沒重疊
IoU = 0.5  → 算「過得去」的偵測（常用門檻）
IoU = 1.0  → 完美對齊</pre>
    <p><strong>Precision/Recall</strong>：
      <br>P = 正確偵測 / 所有偵測（誤判越少 P 越高）
      <br>R = 正確偵測 / 所有實際物件（漏掉越少 R 越高）</p>
  `,
  goal: `🎯 拖動下面兩個框，讓它們的 <strong>IoU ≥ 0.70</strong> 過關。
         <br><span style="font-size:11px;color:#8a8aa5">滑鼠按住框拖移；放開時即時計算</span>`,
  render: function() {
    const body = document.getElementById('challengeBody');
    window._L5 = { gtBox: {x:60, y:50, w:80, h:80}, predBox: {x:140, y:120, w:90, h:70}, dragging: null };
    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>IoU 即時計算</h4>
          <div style="background:#0f0f24;padding:14px;border-radius:6px">
            <div style="font-size:13px;margin-bottom:8px">交集面積 <span id="L5Inter" style="float:right;color:#4ab87e;font-weight:bold">—</span></div>
            <div style="font-size:13px;margin-bottom:8px">聯集面積 <span id="L5Union" style="float:right;color:#d4a04a;font-weight:bold">—</span></div>
            <div style="font-size:18px;margin-top:14px;padding-top:14px;border-top:1px solid #3a2a4a">
              IoU <span id="L5IoU" style="float:right;font-family:monospace;font-weight:bold">—</span>
            </div>
          </div>
          <div style="margin-top:14px;font-size:12px;color:#8a8aa5">
            🟦 藍框 = Ground Truth<br>🟧 橘框 = 你的預測<br>
            按住任一框拖動。目標：IoU ≥ 0.70
          </div>
          ${renderSubmitArea(4, true)}
        </div>
        <div>
          <div class="canvas-wrap" style="background:#1a1a30;cursor:move">
            <canvas id="L5Canvas" width="400" height="300" style="width:400px;height:300px"></canvas>
          </div>
        </div>
      </div>`;
    const c = document.getElementById('L5Canvas');
    c.onmousedown = L5MouseDown; c.onmousemove = L5MouseMove; c.onmouseup = L5MouseUp; c.onmouseleave = L5MouseUp;
    L5Draw();
  },
  computeScore: function() {
    const { gtBox, predBox } = window._L5;
    const iou = computeIoU2(gtBox, predBox);
    return Math.max(0, Math.round(iou * 100));
  }
};
function L5Draw() {
  const { gtBox, predBox } = window._L5;
  const c = document.getElementById('L5Canvas'); const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0a18'; ctx.fillRect(0,0,400,300);
  // GT 藍
  ctx.strokeStyle = '#4a8db8'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(74,141,184,0.15)';
  ctx.fillRect(gtBox.x, gtBox.y, gtBox.w, gtBox.h); ctx.strokeRect(gtBox.x, gtBox.y, gtBox.w, gtBox.h);
  ctx.fillStyle = '#4a8db8'; ctx.font = '11px monospace'; ctx.fillText('GT', gtBox.x+4, gtBox.y+14);
  // 預測 橘
  ctx.strokeStyle = '#d4a04a'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(212,160,74,0.15)';
  ctx.fillRect(predBox.x, predBox.y, predBox.w, predBox.h); ctx.strokeRect(predBox.x, predBox.y, predBox.w, predBox.h);
  ctx.fillStyle = '#d4a04a'; ctx.font = '11px monospace'; ctx.fillText('PRED', predBox.x+4, predBox.y+14);
  // 交集
  const ix = Math.max(gtBox.x, predBox.x), iy = Math.max(gtBox.y, predBox.y);
  const ix2 = Math.min(gtBox.x+gtBox.w, predBox.x+predBox.w), iy2 = Math.min(gtBox.y+gtBox.h, predBox.y+predBox.h);
  if (ix < ix2 && iy < iy2) {
    ctx.fillStyle = 'rgba(74,184,126,0.4)'; ctx.fillRect(ix, iy, ix2-ix, iy2-iy);
    ctx.strokeStyle = '#4ab87e'; ctx.lineWidth = 1; ctx.strokeRect(ix, iy, ix2-ix, iy2-iy);
  }
  // 計算更新 UI
  const inter = Math.max(0, ix2-ix) * Math.max(0, iy2-iy);
  const union = gtBox.w*gtBox.h + predBox.w*predBox.h - inter;
  const iou = inter / union;
  document.getElementById('L5Inter').textContent = Math.round(inter);
  document.getElementById('L5Union').textContent = Math.round(union);
  const iouEl = document.getElementById('L5IoU');
  iouEl.textContent = iou.toFixed(3);
  iouEl.style.color = iou >= 0.70 ? '#4ab87e' : iou >= 0.50 ? '#d4a04a' : '#b85a4a';
  updateLiveScore(4);
}
function L5MouseDown(e) {
  const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const { gtBox, predBox } = window._L5;
  if (x>=predBox.x && x<=predBox.x+predBox.w && y>=predBox.y && y<=predBox.y+predBox.h) {
    window._L5.dragging = 'pred'; window._L5.dragOff = { x: x-predBox.x, y: y-predBox.y };
  } else if (x>=gtBox.x && x<=gtBox.x+gtBox.w && y>=gtBox.y && y<=gtBox.y+gtBox.h) {
    window._L5.dragging = 'gt'; window._L5.dragOff = { x: x-gtBox.x, y: y-gtBox.y };
  }
}
function L5MouseMove(e) {
  if (!window._L5.dragging) return;
  const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const box = window._L5.dragging === 'gt' ? window._L5.gtBox : window._L5.predBox;
  box.x = Math.max(0, Math.min(400-box.w, x - window._L5.dragOff.x));
  box.y = Math.max(0, Math.min(300-box.h, y - window._L5.dragOff.y));
  L5Draw();
}
function L5MouseUp(e) { window._L5.dragging = null; }
function computeIoU2(a, b) {
  const ix = Math.max(a.x, b.x), iy = Math.max(a.y, b.y);
  const ix2 = Math.min(a.x+a.w, b.x+b.w), iy2 = Math.min(a.y+a.h, b.y+b.h);
  if (ix >= ix2 || iy >= iy2) return 0;
  const inter = (ix2-ix)*(iy2-iy);
  const union = a.w*a.h + b.w*b.h - inter;
  return inter / union;
}

// ============================================================
// 提示系統：每 10 分鐘揭露一條，最後一條是正確答案
// ============================================================
const LEVEL_HINTS = [
  // L1 Kernel 與卷積
  [
    '目標是「水平邊緣偵測」(Sobel-Y)。觀察目標圖中亮的橫線。',
    '上下兩列符號相反、中間列為 0。例如 [-1,?,-1, 0,0,0, 1,?,1]。',
    '✅ 正確答案：Kernel = [-1,-2,-1, 0,0,0, 1,2,1], Divisor=1, Bias=128'
  ],
  // L2 多 kernel + Pooling 計算題
  [
    '公式：output_size = floor((input + 2×padding − kernel) / stride) + 1',
    '卷積輸出 = floor((32+2−5)/2)+1 = 15。再 Pool 2×2 → floor(15/2) = ?',
    '✅ 正確答案：7（卷積後 15×15，再 2×2 max pool 變 7×7）'
  ],
  // L3 MobileNet 分類（原 L4）
  [
    '點看自然 / 山景 / 樹林類的場景。',
    '第 2 張（forest 場景，5 棵樹）最容易被辨識為 tree / forest。',
    '✅ 正確答案：點第 2 張（forest 森林場景）'
  ],
  // L4 IoU 物件偵測（原 L5）
  [
    '把橘框（你的預測）拖到藍框（GT）上方，越重疊越好。',
    '兩個框的位置越接近越好。IoU ≥ 0.65 就過關。',
    '✅ 正確答案：把橘框拖到藍框完全相同位置（IoU 接近 1.0）'
  ]
];
function getLevelHints(n) { return LEVEL_HINTS[n-1] || []; }
