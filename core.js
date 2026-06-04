// core.js - shared utility functions for index.html (quest) and lab.html (playground)
// Use ASSETS object from assets.js to avoid file:// CORS issues

const IMG = { bands: [], bandW: 0, bandH: 0, rgb: null, meme: null };

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Image load failed'));
    im.src = src;
  });
}

async function imageToImageData(src, maxW) {
  const im = await loadImage(src);
  let w = im.width, h = im.height;
  if (maxW && w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(im, 0, 0, w, h);
  return c.getContext('2d').getImageData(0, 0, w, h);
}

async function loadAllAssets() {
  if (typeof ASSETS === 'undefined') {
    throw new Error('ASSETS not found - check assets.js is loaded');
  }
  const bandKeys = ['BAND1','BAND2','BAND3','BAND4','BAND5'];
  for (let i = 0; i < 5; i++) {
    const im = await loadImage(ASSETS[bandKeys[i]]);
    if (i === 0) { IMG.bandW = im.width; IMG.bandH = im.height; }
    const c = document.createElement('canvas');
    c.width = IMG.bandW; c.height = IMG.bandH;
    c.getContext('2d').drawImage(im, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, IMG.bandW, IMG.bandH).data;
    const lum = new Uint8ClampedArray(IMG.bandW * IMG.bandH);
    for (let j = 0; j < lum.length; j++) lum[j] = d[j*4];
    IMG.bands.push(lum);
  }
  IMG.rgb = await imageToImageData(ASSETS.RGB, 600);
  IMG.meme = await imageToImageData(ASSETS.MEME, 600);
}

const COLORMAPS = {
  rdylgn: [[165,0,38],[215,48,39],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[217,239,139],[166,217,106],[102,189,99],[26,152,80],[0,104,55]],
  viridis: [[68,1,84],[72,40,120],[62,74,137],[49,104,142],[38,130,142],[31,158,137],[53,183,121],[110,206,88],[181,222,43],[253,231,37]],
  jet: [[0,0,143],[0,0,255],[0,127,255],[0,255,255],[127,255,127],[255,255,0],[255,127,0],[255,0,0],[127,0,0]],
  grey: [[0,0,0],[64,64,64],[128,128,128],[192,192,192],[255,255,255]]
};

function applyCmap(val, name) {
  const cmap = COLORMAPS[name] || COLORMAPS.rdylgn;
  val = Math.max(0, Math.min(1, val));
  const idx = val * (cmap.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(cmap.length - 1, i0 + 1);
  const t = idx - i0;
  return [
    Math.round(cmap[i0][0] * (1-t) + cmap[i1][0] * t),
    Math.round(cmap[i0][1] * (1-t) + cmap[i1][1] * t),
    Math.round(cmap[i0][2] * (1-t) + cmap[i1][2] * t)
  ];
}

function makeColorbarGradient(name) {
  const cmap = COLORMAPS[name];
  return 'linear-gradient(to right, ' + cmap.map((c, i) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ') ' + (i/(cmap.length-1)*100).toFixed(1) + '%').join(', ') + ')';
}

function rgb2hsv(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  const d=max-min;
  let h=0;
  if (d) {
    if (max===r) h=((g-b)/d)%6;
    else if (max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60; if (h<0) h+=360;
  }
  return [h, max===0?0:d/max, max];
}
function hsv2rgb(h,s,v) {
  h=((h%360)+360)%360;
  const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;} else if(h<120){r=x;g=c;}
  else if(h<180){g=c;b=x;} else if(h<240){g=x;b=c;}
  else if(h<300){r=x;b=c;} else {r=c;b=x;}
  return [(r+m)*255,(g+m)*255,(b+m)*255];
}
function rgb2hsi(r,g,b) {
  r/=255; g/=255; b/=255;
  const I=(r+g+b)/3;
  const mn=Math.min(r,g,b);
  const S=I===0?0:1-mn/I;
  const num=0.5*((r-g)+(r-b));
  const den=Math.sqrt((r-g)*(r-g)+(r-b)*(g-b))+1e-9;
  let H=Math.acos(Math.max(-1,Math.min(1,num/den)));
  if (b>g) H=2*Math.PI-H;
  return [H*180/Math.PI, S, I];
}
function hsi2rgb(h,s,i) {
  h=((h%360)+360)%360 * Math.PI/180;
  let r,g,b;
  if (h<2*Math.PI/3) {
    b = i*(1-s);
    r = i*(1+s*Math.cos(h)/Math.cos(Math.PI/3-h));
    g = 3*i-(r+b);
  } else if (h<4*Math.PI/3) {
    h-=2*Math.PI/3;
    r = i*(1-s);
    g = i*(1+s*Math.cos(h)/Math.cos(Math.PI/3-h));
    b = 3*i-(r+g);
  } else {
    h-=4*Math.PI/3;
    g = i*(1-s);
    b = i*(1+s*Math.cos(h)/Math.cos(Math.PI/3-h));
    r = 3*i-(g+b);
  }
  return [r*255, g*255, b*255];
}
function rgb2hsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  const L=(max+min)/2; let H=0, S=0;
  if (max!==min) {
    const d=max-min;
    S = L>0.5 ? d/(2-max-min) : d/(max+min);
    if (max===r) H=((g-b)/d+(g<b?6:0));
    else if (max===g) H=((b-r)/d+2);
    else H=((r-g)/d+4);
    H*=60;
  }
  return [H,S,L];
}
function hsl2rgb(h,s,l) {
  h=((h%360)+360)%360/360;
  let r,g,b;
  if (s===0) { r=g=b=l; }
  else {
    const q=l<0.5?l*(1+s):l+s-l*s;
    const p=2*l-q;
    const hue2rgb=(p,q,t)=>{
      if(t<0)t+=1; if(t>1)t-=1;
      if(t<1/6)return p+(q-p)*6*t;
      if(t<1/2)return q;
      if(t<2/3)return p+(q-p)*(2/3-t)*6;
      return p;
    };
    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
  }
  return [r*255,g*255,b*255];
}
function rgb2cmyk(r,g,b) {
  r/=255; g/=255; b/=255;
  const k=1-Math.max(r,g,b);
  if (k===1) return [0,0,0,1];
  return [(1-r-k)/(1-k),(1-g-k)/(1-k),(1-b-k)/(1-k),k];
}
function cmyk2rgb(c,m,y,k) {
  return [(1-c)*(1-k)*255,(1-m)*(1-k)*255,(1-y)*(1-k)*255];
}
function rgb2xyz(r,g,b) {
  const lin = v => { v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); };
  r=lin(r); g=lin(g); b=lin(b);
  return [
    r*0.4124564+g*0.3575761+b*0.1804375,
    r*0.2126729+g*0.7151522+b*0.0721750,
    r*0.0193339+g*0.1191920+b*0.9503041
  ];
}
function xyz2rgb(x,y,z) {
  let r= x* 3.2404542 + y*-1.5371385 + z*-0.4985314;
  let g= x*-0.9692660 + y* 1.8760108 + z* 0.0415560;
  let b= x* 0.0556434 + y*-0.2040259 + z* 1.0572252;
  const srgb = v => v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055;
  return [srgb(r)*255, srgb(g)*255, srgb(b)*255];
}
function rgb2lab(r,g,b) {
  const [x,y,z]=rgb2xyz(r,g,b);
  const xn=0.95047, yn=1.00000, zn=1.08883;
  const f=v=>v>0.008856?Math.pow(v,1/3):7.787*v+16/116;
  const fx=f(x/xn), fy=f(y/yn), fz=f(z/zn);
  return [116*fy-16, 500*(fx-fy), 200*(fy-fz)];
}
function lab2rgb(L,a,b) {
  const xn=0.95047, yn=1.00000, zn=1.08883;
  const fy=(L+16)/116;
  const fx=a/500+fy;
  const fz=fy-b/200;
  const inv=v=>{const v3=v*v*v; return v3>0.008856?v3:(v-16/116)/7.787;};
  return xyz2rgb(inv(fx)*xn, inv(fy)*yn, inv(fz)*zn);
}
function rgb2ycbcr(r,g,b) {
  return [
    0.299*r+0.587*g+0.114*b,
    128-0.168736*r-0.331264*g+0.5*b,
    128+0.5*r-0.418688*g-0.081312*b
  ];
}
function ycbcr2rgb(y,cb,cr) {
  return [
    y+1.402*(cr-128),
    y-0.344136*(cb-128)-0.714136*(cr-128),
    y+1.772*(cb-128)
  ];
}

function getStructElement(size, shape) {
  const k = [];
  const r = (size - 1) / 2;
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      if (shape === 'square') row.push(1);
      else if (shape === 'cross') row.push((i === r || j === r) ? 1 : 0);
      else if (shape === 'circle') {
        const d = Math.sqrt((i - r) * (i - r) + (j - r) * (j - r));
        row.push(d <= r + 0.01 ? 1 : 0);
      }
    }
    k.push(row);
  }
  return k;
}

function imageDataToGray(imd) {
  const out = new Uint8Array(imd.width * imd.height);
  for (let i = 0; i < out.length; i++) {
    out[i] = 0.299 * imd.data[i*4] + 0.587 * imd.data[i*4+1] + 0.114 * imd.data[i*4+2];
  }
  return out;
}

function binarize(gray, thresh, invert) {
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i] >= thresh ? 255 : 0;
    out[i] = invert ? 255 - v : v;
  }
  return out;
}

function dilateBinary(bin, w, h, kernel) {
  const out = new Uint8Array(w * h);
  const ks = kernel.length, kr = (ks - 1) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      outer: for (let ky = 0; ky < ks; ky++) {
        for (let kx = 0; kx < ks; kx++) {
          if (!kernel[ky][kx]) continue;
          const sy = y + ky - kr, sx = x + kx - kr;
          if (sy < 0 || sy >= h || sx < 0 || sx >= w) continue;
          if (bin[sy*w + sx]) { val = 255; break outer; }
        }
      }
      out[y*w+x] = val;
    }
  }
  return out;
}

function erodeBinary(bin, w, h, kernel) {
  const out = new Uint8Array(w * h);
  const ks = kernel.length, kr = (ks - 1) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 255;
      outer: for (let ky = 0; ky < ks; ky++) {
        for (let kx = 0; kx < ks; kx++) {
          if (!kernel[ky][kx]) continue;
          const sy = y + ky - kr, sx = x + kx - kr;
          if (sy < 0 || sy >= h || sx < 0 || sx >= w || !bin[sy*w+sx]) { val = 0; break outer; }
        }
      }
      out[y*w+x] = val;
    }
  }
  return out;
}

function applyMorphOp(bin, w, h, op, kernel, iter) {
  let cur = bin;
  for (let i = 0; i < iter; i++) {
    if (op === 'dilate') cur = dilateBinary(cur, w, h, kernel);
    else if (op === 'erode') cur = erodeBinary(cur, w, h, kernel);
    else if (op === 'open') cur = dilateBinary(erodeBinary(cur, w, h, kernel), w, h, kernel);
    else if (op === 'close') cur = erodeBinary(dilateBinary(cur, w, h, kernel), w, h, kernel);
  }
  return cur;
}

function binaryToImageData(bin, w, h) {
  const imd = new ImageData(w, h);
  for (let i = 0; i < bin.length; i++) {
    const v = bin[i];
    imd.data[i*4] = v; imd.data[i*4+1] = v; imd.data[i*4+2] = v; imd.data[i*4+3] = 255;
  }
  return imd;
}

function applyConvolution(imd, kernel, divisor, bias) {
  bias = bias || 0;
  const w = imd.width, h = imd.height;
  const size = Math.sqrt(kernel.length);
  const kr = Math.floor(size / 2);
  const out = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rSum=0, gSum=0, bSum=0;
      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const sy = Math.max(0, Math.min(h-1, y + ky - kr));
          const sx = Math.max(0, Math.min(w-1, x + kx - kr));
          const k = kernel[ky*size + kx];
          const idx = (sy*w + sx) * 4;
          rSum += imd.data[idx] * k;
          gSum += imd.data[idx+1] * k;
          bSum += imd.data[idx+2] * k;
        }
      }
      const oi = (y*w + x) * 4;
      out.data[oi]   = Math.max(0, Math.min(255, rSum/divisor + bias));
      out.data[oi+1] = Math.max(0, Math.min(255, gSum/divisor + bias));
      out.data[oi+2] = Math.max(0, Math.min(255, bSum/divisor + bias));
      out.data[oi+3] = 255;
    }
  }
  return out;
}

function applyMedian(imd, size) {
  const w = imd.width, h = imd.height;
  const kr = Math.floor(size / 2);
  const out = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rArr=[], gArr=[], bArr=[];
      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const sy = Math.max(0, Math.min(h-1, y + ky - kr));
          const sx = Math.max(0, Math.min(w-1, x + kx - kr));
          const idx = (sy*w + sx) * 4;
          rArr.push(imd.data[idx]);
          gArr.push(imd.data[idx+1]);
          bArr.push(imd.data[idx+2]);
        }
      }
      rArr.sort((a,b)=>a-b); gArr.sort((a,b)=>a-b); bArr.sort((a,b)=>a-b);
      const mid = Math.floor(rArr.length/2);
      const oi = (y*w + x) * 4;
      out.data[oi]   = rArr[mid];
      out.data[oi+1] = gArr[mid];
      out.data[oi+2] = bArr[mid];
      out.data[oi+3] = 255;
    }
  }
  return out;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function computeIoU(a, b) {
  let inter = 0, union = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] > 0, bv = b[i] > 0;
    if (av && bv) inter++;
    if (av || bv) union++;
  }
  return union === 0 ? 0 : inter / union;
}

function computeMatchRate(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) m++;
  return m / a.length;
}

function computeImageSimilarity(a, b) {
  const n = Math.min(a.data.length, b.data.length);
  let sumSq = 0;
  for (let i = 0; i < n; i += 4) {
    sumSq += (a.data[i]-b.data[i])*(a.data[i]-b.data[i]);
    sumSq += (a.data[i+1]-b.data[i+1])*(a.data[i+1]-b.data[i+1]);
    sumSq += (a.data[i+2]-b.data[i+2])*(a.data[i+2]-b.data[i+2]);
  }
  const mse = sumSq / (n/4 * 3);
  return Math.max(0, 1 - Math.sqrt(mse) / 80);
}

function downsampleImageData(src, scale) {
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').putImageData(src, 0, 0);
  const c2 = document.createElement('canvas');
  c2.width = w; c2.height = h;
  c2.getContext('2d').drawImage(c, 0, 0, w, h);
  return c2.getContext('2d').getImageData(0, 0, w, h);
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2,'0');
}
