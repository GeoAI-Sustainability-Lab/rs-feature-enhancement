// ============================================================
// levels.js - 5 道題目定義
// 每題會即時計算分數 (0-100)，通過門檻才算過關，可重試取最高分
// ============================================================

function defineLevels() {
  LEVEL_DEFS.push(LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5);
}

// ============================================================
// L1 - 植生指標：匹配目標植被遮罩
// ============================================================
const L1_SECRET_THRESHOLD = 0.32;  // 學生要找出這個門檻值

const LEVEL_1 = {
  icon: '🌱',
  title: '植生指標',
  recommendedSec: 360,
  passThreshold: 80,
  theory: `
    <p><strong>NDVI</strong>（歸一化植生指標）= (NIR − R) / (NIR + R)，
    植物對紅光強烈吸收、對近紅外強烈反射，所以植物的 NDVI 接近 +1，建物水泥則接近 0 或負值。</p>
    <p>把 NDVI 大於某個<strong>門檻值</strong>的像素視為「植被」，就能取得植被遮罩。</p>
    <p style="color:#9bd1eb">📖 本題使用航拍多光譜 5 個波段（B / G / R / RE / NIR）的真實數值</p>
  `,
  goal: `🎯 調整 NDVI 門檻值，讓你的<strong>植被遮罩</strong>盡量匹配右側目標。`,
  render: function() {
    const body = document.getElementById('challengeBody');
    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>調整 NDVI 門檻</h4>
          <div class="control-row">
            <label>門檻值 <span class="value" id="L1ThVal">0.30</span></label>
            <input type="range" id="L1Th" min="-0.5" max="0.9" step="0.005" value="0.30">
          </div>
          <div style="margin-top:14px">
            <div style="font-size:12px;color:#8aa5b5;margin-bottom:4px">NDVI 色階圖（參考）</div>
            <div class="canvas-wrap" style="padding:4px;min-height:auto"><canvas id="L1NDVI" style="max-height:160px"></canvas></div>
            <div class="colorbar" id="L1Cbar"></div>
            <div class="colorbar-labels"><span>-1</span><span>0</span><span>+1</span></div>
          </div>
          ${renderSubmitArea(1)}
        </div>
        <div>
          <div class="split-view">
            <div>
              <div class="canvas-wrap"><canvas id="L1Mask"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">你的植被遮罩</div>
            </div>
            <div>
              <div class="canvas-wrap"><canvas id="L1Tgt"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">目標</div>
            </div>
          </div>
        </div>
      </div>
    `;
    const W = IMG.bandW, H = IMG.bandH;
    const ndvi = new Float32Array(W * H);
    const R = IMG.bands[2], NIR = IMG.bands[4];
    for (let i = 0; i < ndvi.length; i++) ndvi[i] = (NIR[i] - R[i]) / (NIR[i] + R[i] + 1e-6);
    window._L1ndvi = ndvi;

    // 預先計算目標遮罩
    const target = new Uint8Array(W * H);
    for (let i = 0; i < ndvi.length; i++) target[i] = ndvi[i] > L1_SECRET_THRESHOLD ? 255 : 0;
    window._L1target = target;

    // 畫 NDVI 色階參考圖
    const c1 = document.getElementById('L1NDVI');
    c1.width = W; c1.height = H;
    const imd1 = new ImageData(W, H);
    for (let i = 0; i < ndvi.length; i++) {
      const t = (ndvi[i] + 1) / 2;
      const [r,g,b] = applyCmap(t, 'rdylgn');
      imd1.data[i*4] = r; imd1.data[i*4+1] = g; imd1.data[i*4+2] = b; imd1.data[i*4+3] = 255;
    }
    c1.getContext('2d').putImageData(imd1, 0, 0);
    document.getElementById('L1Cbar').style.background = makeColorbarGradient('rdylgn');

    // 畫目標遮罩
    const tc = document.getElementById('L1Tgt');
    tc.width = W; tc.height = H;
    const tgtImd = new ImageData(W, H);
    for (let i = 0; i < target.length; i++) {
      if (target[i]) { tgtImd.data[i*4]=60; tgtImd.data[i*4+1]=200; tgtImd.data[i*4+2]=80; }
      else { tgtImd.data[i*4]=60; tgtImd.data[i*4+1]=60; tgtImd.data[i*4+2]=60; }
      tgtImd.data[i*4+3] = 255;
    }
    tc.getContext('2d').putImageData(tgtImd, 0, 0);

    document.getElementById('L1Th').addEventListener('input', L1Update);
    L1Update();
  },
  computeScore: function() {
    return window._L1score || 0;
  }
};

function L1Update() {
  const th = parseFloat(document.getElementById('L1Th').value);
  document.getElementById('L1ThVal').textContent = th.toFixed(3);
  const ndvi = window._L1ndvi;
  const W = IMG.bandW, H = IMG.bandH;
  const myMask = new Uint8Array(W * H);
  const imd = new ImageData(W, H);
  for (let i = 0; i < ndvi.length; i++) {
    if (ndvi[i] > th) {
      myMask[i] = 255;
      imd.data[i*4] = 60; imd.data[i*4+1] = 200; imd.data[i*4+2] = 80;
    } else {
      imd.data[i*4] = 60; imd.data[i*4+1] = 60; imd.data[i*4+2] = 60;
    }
    imd.data[i*4+3] = 255;
  }
  const c2 = document.getElementById('L1Mask');
  c2.width = W; c2.height = H;
  c2.getContext('2d').putImageData(imd, 0, 0);
  // 計算 IoU 作為分數
  const iou = computeIoU(myMask, window._L1target);
  window._L1score = Math.round(iou * 100);
}

// ============================================================
// L2 - 色彩空間：HSV 多通道精準目標 (難度↑)
// ============================================================
const LEVEL_2 = {
  icon: '🎨',
  title: '色彩空間',
  recommendedSec: 360,
  passThreshold: 80,
  theory: `
    <p>RGB 不適合直接調整「顏色強度」或「亮度」。轉到 <strong>HSV</strong>（色相/飽和度/明度）後，
    每個通道意義明確：</p>
    <ul>
      <li><strong>H（Hue）</strong>：顏色種類 0–360°（0=紅、60=黃、120=綠、240=藍）</li>
      <li><strong>S（Saturation）</strong>：顏色純度 0–1（0=灰、1=最鮮豔）</li>
      <li><strong>V（Value）</strong>：亮度 0–1</li>
    </ul>
    <p>遙測應用：分離顏色資訊與亮度資訊、做選擇性處理（例如只調整綠色部分）。</p>
  `,
  goal: `🎯 調整 HSV 三個軸（色相位移、飽和度倍率、明度倍率），讓你的處理結果匹配右側目標圖。`,
  render: function() {
    const body = document.getElementById('challengeBody');
    // 預先計算目標圖（祕密參數：H+30°、S×0.30、V×0.80）
    const src = IMG.meme;
    const target = new ImageData(src.width, src.height);
    const SEC_H = 30, SEC_S = 0.30, SEC_V = 0.80;
    for (let i = 0; i < src.data.length; i += 4) {
      const [h, s, v] = rgb2hsv(src.data[i], src.data[i+1], src.data[i+2]);
      const [r, g, b] = hsv2rgb(h + SEC_H, Math.min(1, s * SEC_S), Math.min(1, v * SEC_V));
      target.data[i] = Math.max(0, Math.min(255, r));
      target.data[i+1] = Math.max(0, Math.min(255, g));
      target.data[i+2] = Math.max(0, Math.min(255, b));
      target.data[i+3] = 255;
    }
    window._L2target = target;

    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>HSV 三軸調整</h4>
          <div class="control-row">
            <label>H 色相位移 −60 ~ +60° <span class="value" id="L2HV">0</span></label>
            <input type="range" id="L2H" min="-60" max="60" step="1" value="0">
          </div>
          <div class="control-row">
            <label>S 飽和度倍率 <span class="value" id="L2SV">1.00</span></label>
            <input type="range" id="L2S" min="0" max="2" step="0.01" value="1.0">
          </div>
          <div class="control-row">
            <label>V 明度倍率 <span class="value" id="L2VV">1.00</span></label>
            <input type="range" id="L2V" min="0" max="2" step="0.01" value="1.0">
          </div>
          ${renderSubmitArea(2)}
        </div>
        <div>
          <div class="split-view">
            <div>
              <div class="canvas-wrap"><canvas id="L2Canvas"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">你的結果</div>
            </div>
            <div>
              <div class="canvas-wrap"><canvas id="L2Tgt"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">目標</div>
            </div>
          </div>
        </div>
      </div>
    `;
    // 畫目標圖
    const tc = document.getElementById('L2Tgt');
    tc.width = src.width; tc.height = src.height;
    tc.getContext('2d').putImageData(target, 0, 0);

    document.getElementById('L2H').addEventListener('input', L2Update);
    document.getElementById('L2S').addEventListener('input', L2Update);
    document.getElementById('L2V').addEventListener('input', L2Update);
    L2Update();
  },
  computeScore: function() {
    return window._L2score || 0;
  }
};

function L2Update() {
  const hShift = parseInt(document.getElementById('L2H').value);
  const sMul = parseFloat(document.getElementById('L2S').value);
  const vMul = parseFloat(document.getElementById('L2V').value);
  document.getElementById('L2HV').textContent = (hShift > 0 ? '+' : '') + hShift;
  document.getElementById('L2SV').textContent = sMul.toFixed(2);
  document.getElementById('L2VV').textContent = vMul.toFixed(2);
  const src = IMG.meme;
  const c = document.getElementById('L2Canvas');
  c.width = src.width; c.height = src.height;
  const out = new ImageData(src.width, src.height);
  for (let i = 0; i < src.data.length; i += 4) {
    const [h, s, v] = rgb2hsv(src.data[i], src.data[i+1], src.data[i+2]);
    const [r, g, b] = hsv2rgb(h + hShift, Math.min(1, s * sMul), Math.min(1, v * vMul));
    out.data[i] = Math.max(0, Math.min(255, r));
    out.data[i+1] = Math.max(0, Math.min(255, g));
    out.data[i+2] = Math.max(0, Math.min(255, b));
    out.data[i+3] = 255;
  }
  c.getContext('2d').putImageData(out, 0, 0);
  // 計算與目標的相似度
  const sim = computeImageSimilarity(out, window._L2target);
  window._L2score = Math.round(sim * 100);
}

// ============================================================
// L3 - 形態學：目標形狀匹配（難度↑：取消提示中的精確數值）
// ============================================================
const LEVEL_3 = {
  icon: '⬛',
  title: '形態學',
  recommendedSec: 500,
  passThreshold: 85,
  theory: `
    <p>形態學的四大運算：</p>
    <ul>
      <li><strong>膨脹（Dilation）</strong>：白色區域變大，填補小洞</li>
      <li><strong>侵蝕（Erosion）</strong>：白色區域變小，去除小雜點</li>
      <li><strong>開運算（Opening = 先侵蝕後膨脹）</strong>：去除小型白雜點，保留大形狀</li>
      <li><strong>閉運算（Closing = 先膨脹後侵蝕）</strong>：填補小型黑洞，連接鄰近區塊</li>
    </ul>
    <p>遙測應用：去除雜訊、平滑物件邊緣、分離或連接區塊（如建物、田區）。</p>
  `,
  goal: `🎯 將原圖透過二值化 + 形態學處理，<strong>還原</strong>右側目標圖。`,
  render: function() {
    const body = document.getElementById('challengeBody');
    const small = downsampleImageData(IMG.meme, 350 / IMG.meme.width);
    window._L3small = small;
    const gray = imageDataToGray(small);
    let bin = binarize(gray, 110, 0);
    const k = getStructElement(5, 'circle');
    bin = dilateBinary(erodeBinary(bin, small.width, small.height, k), small.width, small.height, k);
    bin = erodeBinary(dilateBinary(bin, small.width, small.height, k), small.width, small.height, k);
    window._L3target = bin;

    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>1. 二值化門檻</h4>
          <div class="control-row">
            <label>Threshold <span class="value" id="L3Th">128</span></label>
            <input type="range" id="L3ThSlider" min="50" max="200" value="128">
          </div>
          <h4>2. 結構元（Kernel）</h4>
          <div class="control-row">
            <label>大小 <span class="value" id="L3K">3×3</span></label>
            <input type="range" id="L3KSlider" min="3" max="11" step="2" value="3">
          </div>
          <select id="L3Shape">
            <option value="square">方形</option>
            <option value="cross">十字</option>
            <option value="circle">圓形</option>
          </select>
          <h4 style="margin-top:14px">3. 運算流程（最多 3 步驟）</h4>
          <select id="L3Op1" style="margin-bottom:6px">
            <option value="none">—</option>
            <option value="dilate">膨脹</option>
            <option value="erode">侵蝕</option>
            <option value="open">開運算</option>
            <option value="close">閉運算</option>
          </select>
          <select id="L3Op2" style="margin-bottom:6px">
            <option value="none">—</option>
            <option value="dilate">膨脹</option>
            <option value="erode">侵蝕</option>
            <option value="open">開運算</option>
            <option value="close">閉運算</option>
          </select>
          <select id="L3Op3">
            <option value="none">—</option>
            <option value="dilate">膨脹</option>
            <option value="erode">侵蝕</option>
            <option value="open">開運算</option>
            <option value="close">閉運算</option>
          </select>
          ${renderSubmitArea(3)}
        </div>
        <div>
          <div class="split-view">
            <div>
              <div class="canvas-wrap"><canvas id="L3Out"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">你的結果</div>
            </div>
            <div>
              <div class="canvas-wrap"><canvas id="L3Tgt"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">目標</div>
            </div>
          </div>
        </div>
      </div>
    `;
    const tc = document.getElementById('L3Tgt');
    tc.width = small.width; tc.height = small.height;
    tc.getContext('2d').putImageData(binaryToImageData(window._L3target, small.width, small.height), 0, 0);
    document.getElementById('L3ThSlider').addEventListener('input', e => {
      document.getElementById('L3Th').textContent = e.target.value;
      L3Compute();
    });
    document.getElementById('L3KSlider').addEventListener('input', e => {
      document.getElementById('L3K').textContent = `${e.target.value}×${e.target.value}`;
      L3Compute();
    });
    ['L3Shape','L3Op1','L3Op2','L3Op3'].forEach(id =>
      document.getElementById(id).addEventListener('change', L3Compute)
    );
    L3Compute();
  },
  computeScore: function() {
    return window._L3score || 0;
  }
};

function L3Compute() {
  const small = window._L3small;
  const gray = imageDataToGray(small);
  const th = parseInt(document.getElementById('L3ThSlider').value);
  let bin = binarize(gray, th, 0);
  const ks = parseInt(document.getElementById('L3KSlider').value);
  const shape = document.getElementById('L3Shape').value;
  const k = getStructElement(ks, shape);
  ['L3Op1','L3Op2','L3Op3'].forEach(id => {
    const op = document.getElementById(id).value;
    if (op !== 'none') bin = applyMorphOp(bin, small.width, small.height, op, k, 1);
  });
  window._L3result = bin;
  const c = document.getElementById('L3Out');
  c.width = small.width; c.height = small.height;
  c.getContext('2d').putImageData(binaryToImageData(bin, small.width, small.height), 0, 0);
  const match = computeMatchRate(bin, window._L3target);
  window._L3score = Math.round(match * 100);
}

// ============================================================
// L4 - 濾波器：自訂卷積核 (難度↑)
// ============================================================
const LEVEL_4 = {
  icon: '🔲',
  title: '濾波器',
  recommendedSec: 360,
  passThreshold: 80,
  theory: `
    <p><strong>卷積（Convolution）</strong>：每個輸出像素 = 鄰近 3×3 像素 × 卷積核值的加總 ÷ 除數。</p>
    <ul>
      <li><strong>低通（Low-Pass）</strong>：核值都是正數，效果是<em>模糊</em>，去除高頻雜訊。例：均值、高斯</li>
      <li><strong>高通（High-Pass）</strong>：核值有正有負，效果是<em>強化邊緣</em>。例：Laplacian、Sobel</li>
    </ul>
    <p>這就是 CNN 的基本運算 — 差別只在 CNN 的核是被訓練出來的。</p>
  `,
  goal: `🎯 自己手動填入一組 <strong>3×3 卷積核</strong>，產生跟目標相同的水平邊緣強化效果。`,
  render: function() {
    const body = document.getElementById('challengeBody');
    const small = downsampleImageData(IMG.meme, 400 / IMG.meme.width);
    window._L4small = small;
    const sobelY = [-1,-2,-1, 0,0,0, 1,2,1];
    const tgt = applyConvolution(small, sobelY, 1, 128);
    window._L4target = tgt;

    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>填入 3×3 卷積核（9 個數值）</h4>
          <div id="L4Kernel" style="display:inline-grid;grid-template-columns:repeat(3, 1fr);gap:4px;margin:8px 0">
            ${Array(9).fill(0).map((_,i) => `<input type="number" step="1" value="0" data-idx="${i}" style="width:55px;text-align:center" id="L4K${i}">`).join('')}
          </div>
          <div class="control-row">
            <label>Divisor 除數 <span class="value" id="L4DivV">1</span></label>
            <input type="range" id="L4Div" min="1" max="50" value="1">
          </div>
          <div class="control-row">
            <label>Bias 偏移 <span class="value" id="L4BiasV">128</span></label>
            <input type="range" id="L4Bias" min="0" max="255" value="128">
          </div>
          <button class="btn" onclick="L4Compute()" style="margin-top:8px;width:100%">▶ 套用看看</button>
          ${renderSubmitArea(4)}
        </div>
        <div>
          <div class="split-view">
            <div>
              <div class="canvas-wrap"><canvas id="L4Out"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">你的結果</div>
            </div>
            <div>
              <div class="canvas-wrap"><canvas id="L4Tgt"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">目標（水平邊緣）</div>
            </div>
          </div>
        </div>
      </div>
    `;
    const tc = document.getElementById('L4Tgt');
    tc.width = small.width; tc.height = small.height;
    tc.getContext('2d').putImageData(tgt, 0, 0);
    document.getElementById('L4Div').addEventListener('input', e => {
      document.getElementById('L4DivV').textContent = e.target.value;
      L4Compute();
    });
    document.getElementById('L4Bias').addEventListener('input', e => {
      document.getElementById('L4BiasV').textContent = e.target.value;
      L4Compute();
    });
    for (let i = 0; i < 9; i++) {
      document.getElementById(`L4K${i}`).addEventListener('change', L4Compute);
    }
    L4Compute();
  },
  computeScore: function() {
    return window._L4score || 0;
  }
};

function L4Compute() {
  const small = window._L4small;
  const kernel = [];
  for (let i = 0; i < 9; i++) {
    const v = parseFloat(document.getElementById(`L4K${i}`).value);
    kernel.push(isNaN(v) ? 0 : v);
  }
  const div = parseInt(document.getElementById('L4Div').value) || 1;
  const bias = parseInt(document.getElementById('L4Bias').value) || 0;
  const result = applyConvolution(small, kernel, div, bias);
  window._L4result = result;
  const c = document.getElementById('L4Out');
  c.width = small.width; c.height = small.height;
  c.getContext('2d').putImageData(result, 0, 0);
  const sim = computeImageSimilarity(result, window._L4target);
  window._L4score = Math.round(sim * 100);
  updateLiveScore(4);
}

// ============================================================
// L5 - HSL 葉色匹配（難度↑：3 種葉色順序匹配）
// ============================================================
const LEAF_TARGETS = [
  { h: 95, s: 0.45, l: 0.42, name: '健康闊葉（中等綠）' },
  { h: 110, s: 0.55, l: 0.32, name: '深綠林冠' },
  { h: 80, s: 0.50, l: 0.50, name: '陽光草地' },
  { h: 120, s: 0.40, l: 0.28, name: '森林暗綠' },
  { h: 65, s: 0.65, l: 0.55, name: '嫩芽黃綠' },
  { h: 150, s: 0.35, l: 0.30, name: '松針深綠帶藍' },
  { h: 35, s: 0.55, l: 0.40, name: '初秋枯黃' },
  { h: 15, s: 0.70, l: 0.42, name: '紅楓' }
];

const LEVEL_5 = {
  icon: '🎯',
  title: 'HSL 葉色匹配',
  recommendedSec: 360,
  passThreshold: 80,
  theory: `
    <p><strong>HSL</strong>（Hue/Saturation/Lightness）跟 HSV 類似，但 L 的定義是
    「最亮與最暗的中點」，更符合人眼對「亮度」的直覺。CSS 的 hsl() 顏色就是用這個。</p>
    <p>遙測應用：植被顏色細微差異判讀（嫩葉/老葉/枯葉/不同物種）、人工判讀色階規劃。</p>
  `,
  goal: `🎯 用 HSL 三個滑桿匹配右側目標葉色。`,
  render: function() {
    const body = document.getElementById('challengeBody');
    const pick = LEAF_TARGETS[Math.floor(Math.random() * LEAF_TARGETS.length)];
    window._L5target = pick;
    body.innerHTML = `
      <div class="layout">
        <div class="panel">
          <h4>HSL 滑桿</h4>
          <div class="control-row">
            <label>H 色相 0–360 <span class="value" id="L5HV">120</span></label>
            <input type="range" id="L5H" min="0" max="360" value="120">
          </div>
          <div class="control-row">
            <label>S 飽和度 0–100% <span class="value" id="L5SV">50</span></label>
            <input type="range" id="L5S" min="0" max="100" value="50">
          </div>
          <div class="control-row">
            <label>L 亮度 0–100% <span class="value" id="L5LV">50</span></label>
            <input type="range" id="L5L" min="0" max="100" value="50">
          </div>
          <div id="L5HslCode" style="background:#0a1218;color:#9bd1eb;padding:8px;border-radius:4px;font-family:monospace;font-size:12px;margin-top:8px">—</div>
          <button class="btn" onclick="L5NewTarget()" style="margin-top:8px;width:100%">🎲 重新抽一個目標葉色</button>
          ${renderSubmitArea(5)}
        </div>
        <div>
          <div class="split-view">
            <div>
              <div class="canvas-wrap" style="background:transparent"><canvas id="L5Tgt" width="220" height="220"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px" id="L5TgtName">目標</div>
            </div>
            <div>
              <div class="canvas-wrap" style="background:transparent"><canvas id="L5You" width="220" height="220"></canvas></div>
              <div style="text-align:center;font-size:12px;color:#8aa5b5;margin-top:4px">你的調色</div>
            </div>
          </div>
        </div>
      </div>
    `;
    drawLeaf('L5Tgt', pick.h, pick.s, pick.l);
    document.getElementById('L5TgtName').textContent = '目標：' + pick.name;
    ['L5H','L5S','L5L'].forEach(id => document.getElementById(id).addEventListener('input', L5Update));
    L5Update();
  },
  computeScore: function() {
    return window._L5score || 0;
  }
};

function L5NewTarget() {
  const pick = LEAF_TARGETS[Math.floor(Math.random() * LEAF_TARGETS.length)];
  window._L5target = pick;
  drawLeaf('L5Tgt', pick.h, pick.s, pick.l);
  document.getElementById('L5TgtName').textContent = '目標：' + pick.name;
  L5Update();
}

function drawLeaf(canvasId, h, s, l) {
  const c = document.getElementById(canvasId);
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.fillStyle = '#0a1218';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'hsl(' + h + ', ' + (s*100) + '%, ' + (l*100) + '%)';
  ctx.beginPath();
  const cx = W/2, cy = H/2;
  for (let i = 0; i <= 360; i += 2) {
    const a = i * Math.PI / 180;
    const r = 70 + 25 * Math.cos(2*a) - 12 * Math.sin(a);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a) * 1.3;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'hsl(' + h + ', ' + (s*100) + '%, ' + Math.max(5, l*100-15) + '%)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80);
  for (let dy = -50; dy <= 50; dy += 22) {
    ctx.moveTo(cx, cy + dy);
    ctx.quadraticCurveTo(cx + 18, cy + dy + 7, cx + 42, cy + dy + 13);
    ctx.moveTo(cx, cy + dy);
    ctx.quadraticCurveTo(cx - 18, cy + dy + 7, cx - 42, cy + dy + 13);
  }
  ctx.stroke();
}

function L5Update() {
  const h = parseInt(document.getElementById('L5H').value);
  const s = parseInt(document.getElementById('L5S').value);
  const l = parseInt(document.getElementById('L5L').value);
  document.getElementById('L5HV').textContent = h;
  document.getElementById('L5SV').textContent = s;
  document.getElementById('L5LV').textContent = l;
  const [r,g,b] = hsl2rgb(h, s/100, l/100).map(v => Math.round(v));
  document.getElementById('L5HslCode').textContent = 'hsl(' + h + ', ' + s + '%, ' + l + '%) → RGB(' + r + ', ' + g + ', ' + b + ')';
  drawLeaf('L5You', h, s/100, l/100);
  const tgt = window._L5target;
  const [tr, tg, tb] = hsl2rgb(tgt.h, tgt.s, tgt.l);
  const d = Math.sqrt((r-tr)*(r-tr) + (g-tg)*(g-tg) + (b-tb)*(b-tb));
  // 距離 0 → 100；距離 40 → 80；距離 100 → 50；距離 200+ → 0
  window._L5score = Math.max(0, Math.round(100 - d * 0.5));
  updateLiveScore(5);
}

// ============================================================
// 共用：分數提交區塊 + 即時分數顯示
// ============================================================
function renderSubmitArea(levelNum) {
  // L1-L3: 只在提交後才看到分數（沒有即時分數顯示）
  // L4-L5: 即時顯示分數（因為這兩關需要看分數回饋才能調整自訂卷積核/顏色）
  const showLive = levelNum >= 4;
  return `
    ${showLive ? `<div id="L${levelNum}LiveScore" class="score-display fail" style="margin-top:14px;font-size:24px">即時分數：—</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn success big" onclick="submitLevel(${levelNum})" style="flex:1">📤 提交查看分數</button>
    </div>
    <div id="L${levelNum}SubmitMsg" style="margin-top:10px;font-size:13px"></div>
  `;
}

function updateLiveScore(levelNum) {
  const lv = LEVEL_DEFS[levelNum - 1];
  const score = lv.computeScore();
  const el = document.getElementById('L' + levelNum + 'LiveScore');
  if (!el) return;
  el.textContent = '即時分數：' + score;
  el.className = 'score-display ' + (score >= lv.passThreshold ? 'pass' : score >= lv.passThreshold - 15 ? 'almost' : 'fail');
}

async function submitLevel(levelNum) {
  const lv = LEVEL_DEFS[levelNum - 1];
  const score = lv.computeScore();
  const msgEl = document.getElementById('L' + levelNum + 'SubmitMsg');
  if (score < lv.passThreshold) {
    msgEl.innerHTML = '<span style="color:#b85a4a">⚠ 分數 ' + score + ' < ' + lv.passThreshold + '，未過關。繼續調整～</span>';
    return;
  }
  const prev = APP.levelScores[levelNum - 1] || 0;
  const isFirstPass = APP.levelTimes[levelNum - 1] === null;
  const improved = score > prev;
  if (improved) APP.levelScores[levelNum - 1] = score;
  if (isFirstPass) {
    APP.levelTimes[levelNum - 1] = Date.now();
    if (levelNum + 1 > APP.unlockedLevel) APP.unlockedLevel = levelNum + 1;
    APP.currentLevel = (levelNum < 5) ? levelNum + 1 : null;
  }
  saveState();
  if (APP.webAppUrl) {
    sheetCall({ action: 'recordLevel', id: APP.studentId, level: levelNum, score: score });
  }
  let txt;
  if (isFirstPass) {
    txt = '🎉 L' + levelNum + ' 過關！分數 <strong>' + score + '</strong>' + (levelNum < 5 ? ' · 下一關已解鎖' : ' · 全部完成！');
  } else if (improved) {
    txt = '📈 分數從 ' + prev + ' 提升到 <strong>' + score + '</strong>！';
  } else {
    txt = '✓ 分數 ' + score + '（未超過你之前的最高分 ' + prev + '）';
  }
  msgEl.innerHTML = '<span style="color:#4ab87e">' + txt + '</span>';
  setTimeout(() => { renderQuest(); updateUserBar(); }, isFirstPass ? 1500 : 0);
}
