/**
 * Holo Dev — Holographic Video Player
 * Usage: <script type="module" src="/videoplayer.js"></script>
 *        <holo-video-player src="/media/movie.mp4" controls></holo-video-player>
 *
 * Uses the browser's native media pipeline for source resolution/codec support.
 * 3D mode creates a luminance-guided, side-by-side stereo view in WebGL.
 * For true scene-depth reconstruction or a physical holographic display, connect
 * a depthEstimator / display adapter using the documented custom events below.
 */

const PLAYER_STYLES = `
:host{display:block;position:relative;width:100%;aspect-ratio:16/9;background:#05070d;color:#fff;
  overflow:hidden;border-radius:12px;contain:content;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}
*{box-sizing:border-box}
.stage{position:absolute;inset:0;background:#000;display:grid;place-items:center}
video,.stereo{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
video{display:block}
.stereo{display:none;pointer-events:none}
:host([data-3d="true"]) video{visibility:hidden}
:host([data-3d="true"]) .stereo{display:block}
.scrim{position:absolute;inset:0;opacity:0;pointer-events:none;background:linear-gradient(0deg,rgba(0,0,0,.68),transparent 28%,transparent 72%,rgba(0,0,0,.24));transition:opacity .22s}
:host(.active) .scrim{opacity:1}
button{font:inherit;color:inherit;border:0;cursor:pointer}
.icon-button{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;
  background:rgba(8,15,28,.68);border:1px solid rgba(150,220,255,.24);backdrop-filter:blur(12px);
  color:#eafaff;transition:background .18s,transform .18s,opacity .25s}
.icon-button:hover{background:rgba(15,95,125,.82);transform:scale(1.06)}
.icon-button svg{width:21px;height:21px;fill:currentColor}
.settings{position:absolute;z-index:5;right:14px;top:14px;opacity:0;pointer-events:none;transition:opacity .3s}
:host(.active) .settings{opacity:1;pointer-events:auto}
.settings-menu{position:absolute;right:0;top:50px;min-width:205px;padding:8px;border:1px solid rgba(127,220,255,.24);
  border-radius:12px;background:rgba(5,13,25,.94);box-shadow:0 12px 38px #0009;backdrop-filter:blur(18px);
  display:none;z-index:7}
.settings-menu.open{display:block}
.menu-title{padding:7px 10px;color:#9eb9ca;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.toggle-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:11px 10px;border-radius:8px;background:transparent;text-align:left}
.toggle-row:hover{background:#ffffff12}
.switch{width:36px;height:20px;border-radius:20px;background:#536170;position:relative;flex:none;transition:background .2s}
.switch:after{content:"";position:absolute;width:14px;height:14px;left:3px;top:3px;border-radius:50%;background:white;transition:transform .2s}
.toggle-row[aria-checked="true"] .switch{background:#19b9d7}
.toggle-row[aria-checked="true"] .switch:after{transform:translateX(16px)}
.center-control{position:absolute;z-index:4;left:50%;top:50%;transform:translate(-50%,-50%);
  width:66px;height:66px;border-radius:50%;display:grid;place-items:center;
  background:rgba(5,15,28,.62);border:1px solid rgba(163,231,255,.45);
  box-shadow:0 0 28px rgba(0,194,255,.2);opacity:0;pointer-events:none;transition:opacity .22s}
:host(.active) .center-control{opacity:1;pointer-events:auto}
.center-control svg{width:29px;height:29px;fill:white}
.timeline{position:absolute;z-index:4;left:16px;right:16px;bottom:14px;display:flex;align-items:center;gap:10px;
  opacity:0;pointer-events:none;transition:opacity .22s}
:host(.active) .timeline{opacity:1;pointer-events:auto}
.time{font-size:11px;font-variant-numeric:tabular-nums;color:#e8f8ff;min-width:36px;text-align:center}
.seek{appearance:none;-webkit-appearance:none;flex:1;height:4px;border-radius:5px;background:linear-gradient(90deg,#20d5ed var(--progress,0%),#ffffff55 var(--progress,0%));outline:none;cursor:pointer}
.seek::-webkit-slider-thumb{appearance:none;width:12px;height:12px;border-radius:50%;background:#e8fbff;box-shadow:0 0 8px #23d8f5}
.seek::-moz-range-thumb{width:12px;height:12px;border:0;border-radius:50%;background:#e8fbff}
.status{position:absolute;left:14px;top:14px;z-index:3;padding:5px 9px;border-radius:6px;
  color:#b9f7ff;background:#052331bb;font-size:10px;letter-spacing:.12em;text-transform:uppercase;display:none}
:host([data-3d="true"]) .status{display:block}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important}}
`;

const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
const GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19.4 13.5 1.4 1.1-1.5 2.6-1.7-.6a7.7 7.7 0 0 1-1.5.9l-.3 1.8h-3l-.3-1.8a7.7 7.7 0 0 1-1.5-.9l-1.7.6-1.5-2.6 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.6a7.7 7.7 0 0 1 1.5-.9l.3-1.8h3l.3 1.8a7.7 7.7 0 0 1 1.5.9l1.7-.6 1.5 2.6-1.4 1.1a7 7 0 0 1 0 1.8ZM14.3 15a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"/></svg>';

class HoloVideoPlayer extends HTMLElement {
  static get observedAttributes() { return ['src','poster','autoplay','muted','loop','crossorigin']; }

  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._hideTimer = null;
    this._raf = 0;
    this._gl = null;
    this._program = null;
    this._texture = null;
    this._videoFrameCallback = null;
    this._lastTime = -1;
    this._build();
  }

  connectedCallback() {
    this._syncAttributes();
    this._bind();
    this._showControls();
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this);
    if (this.hasAttribute('autoplay')) this.video.play().catch(() => {});
  }

  disconnectedCallback() {
    clearTimeout(this._hideTimer);
    cancelAnimationFrame(this._raf);
    this._resizeObserver?.disconnect();
    if (this._videoFrameCallback != null && this.video.cancelVideoFrameCallback)
      this.video.cancelVideoFrameCallback(this._videoFrameCallback);
  }

  attributeChangedCallback(name) {
    if (this.isConnected && this.video) this._syncAttributes();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>${PLAYER_STYLES}</style>
      <div class="stage" part="stage">
        <video part="video" playsinline preload="metadata"></video>
        <canvas class="stereo" part="stereo-canvas" aria-label="Side-by-side 3D video output"></canvas>
        <div class="scrim"></div><div class="status">3D Holographic</div>
        <div class="settings">
          <button class="icon-button gear" aria-label="Video settings" aria-expanded="false">${GEAR}</button>
          <div class="settings-menu" role="menu">
            <div class="menu-title">Video settings</div>
            <button class="toggle-row" role="menuitemcheckbox" aria-checked="false">
              <span>3D Holographic</span><span class="switch" aria-hidden="true"></span>
            </button>
          </div>
        </div>
        <button class="center-control" aria-label="Play">${PLAY}</button>
        <div class="timeline">
          <span class="time current">0:00</span>
          <input class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Video timeline">
          <span class="time duration">0:00</span>
        </div>
      </div>`;
    this.video = this.shadowRoot.querySelector('video');
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.ctx2d = null;
  }

  _syncAttributes() {
    const v = this.video;
    if (this.hasAttribute('src')) v.src = this.getAttribute('src');
    if (this.hasAttribute('poster')) v.poster = this.getAttribute('poster');
    v.autoplay = this.hasAttribute('autoplay');
    v.muted = this.hasAttribute('muted');
    v.loop = this.hasAttribute('loop');
    if (this.hasAttribute('crossorigin')) v.crossOrigin = this.getAttribute('crossorigin') || 'anonymous';
  }

  _bind() {
    const root = this.shadowRoot;
    this.playButton = root.querySelector('.center-control');
    this.gear = root.querySelector('.gear');
    this.menu = root.querySelector('.settings-menu');
    this.modeToggle = root.querySelector('.toggle-row');
    this.seek = root.querySelector('.seek');

    this.playButton.addEventListener('click', () => this.togglePlayback());
    this.gear.addEventListener('click', () => {
      const open = !this.menu.classList.contains('open');
      this.menu.classList.toggle('open', open);
      this.gear.setAttribute('aria-expanded', String(open));
      this._showControls();
    });
    this.modeToggle.addEventListener('click', () => this.setHolographic3D(!this.holographic3D));
    this.seek.addEventListener('input', () => {
      if (Number.isFinite(this.video.duration) && this.video.duration > 0)
        this.video.currentTime = (Number(this.seek.value) / 1000) * this.video.duration;
      this._updateTimeline();
      this._showControls();
    });

    this.video.addEventListener('play', () => { this._updatePlayButton(); this._startRenderer(); this._emit('holo:play'); });
    this.video.addEventListener('pause', () => { this._updatePlayButton(); this._emit('holo:pause'); this._showControls(true); });
    this.video.addEventListener('ended', () => this._showControls(true));
    this.video.addEventListener('timeupdate', () => this._updateTimeline());
    this.video.addEventListener('loadedmetadata', () => {
      this._updateTimeline();
      this._emit('holo:metadata', {videoWidth:this.video.videoWidth,videoHeight:this.video.videoHeight,duration:this.video.duration});
    });
    this.video.addEventListener('error', () => this._emit('holo:error', {error:this.video.error}));
    this.video.addEventListener('loadeddata', () => { if (this.holographic3D) this._startRenderer(); });

    this.addEventListener('pointermove', () => this._showControls(), {passive:true});
    this.addEventListener('pointerdown', () => this._showControls(), {passive:true});
    this.addEventListener('touchstart', () => this._showControls(), {passive:true});
    this.addEventListener('keydown', e => {
      if (e.target === this.seek || e.target === this.modeToggle) return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePlayback(); }
      if (e.key.toLowerCase() === 'f') this._toggleFullscreen();
      this._showControls();
    });
    this.addEventListener('pointerleave', () => {
      if (!this.menu.classList.contains('open') && !this.video.paused) this._scheduleHide();
    });
  }

  _showControls(force = false) {
    this.classList.add('active');
    this._updatePlayButton();
    clearTimeout(this._hideTimer);
    if (force || this.video.paused || this.menu.classList.contains('open')) return;
    this._scheduleHide();
  }

  _scheduleHide() {
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this.classList.remove('active');
      this.menu.classList.remove('open');
      this.gear.setAttribute('aria-expanded','false');
    }, 10000);
  }

  _updatePlayButton() {
    const paused = this.video.paused || this.video.ended;
    this.playButton.innerHTML = paused ? PLAY : PAUSE;
    this.playButton.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  }

  async togglePlayback() {
    if (this.video.paused || this.video.ended) {
      try { await this.video.play(); } catch (error) { this._emit('holo:playback-blocked',{error}); }
    } else this.video.pause();
    this._updatePlayButton();
    this._showControls();
  }

  _formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const s = Math.floor(seconds);
    return s >= 3600 ? `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
      : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }

  _updateTimeline() {
    if (!this.video) return;
    const duration = this.video.duration || 0;
    const current = this.video.currentTime || 0;
    this.shadowRoot.querySelector('.current').textContent = this._formatTime(current);
    this.shadowRoot.querySelector('.duration').textContent = this._formatTime(duration);
    const value = duration ? (current/duration)*1000 : 0;
    this.seek.value = String(value);
    this.seek.style.setProperty('--progress', `${value/10}%`);
  }

  setHolographic3D(enabled) {
    this.holographic3D = Boolean(enabled);
    this.dataset['3d'] = String(this.holographic3D);
    this.modeToggle.setAttribute('aria-checked',String(this.holographic3D));
    if (this.holographic3D) {
      this._initRenderer();
      this._startRenderer();
      this._emit('holo:3d-enabled',{output:'side-by-side',depthModel:'luminance-parallax'});
    } else {
      cancelAnimationFrame(this._raf);
      this._emit('holo:3d-disabled');
    }
    this._showControls();
  }

  _initRenderer() {
    if (this._gl || this._rendererFailed) return;
    const gl = this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:false});
    if (!gl) { this._rendererFailed = true; this._emit('holo:renderer-unavailable'); return; }
    const vertex = `attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*0.5;gl_Position=vec4(p,0.0,1.0);}`;
    const fragment = `
      precision mediump float;
      varying vec2 uv; uniform sampler2D frame; uniform float strength;
      void main(){
        float eye = step(0.5,uv.x);
        vec2 sampleUV = vec2(fract(uv.x*2.0),uv.y);
        vec3 base = texture2D(frame,sampleUV).rgb;
        float depth = dot(base,vec3(0.2126,0.7152,0.0722));
        float shift = (depth-0.5)*strength*(eye>0.5?1.0:-1.0);
        vec2 displaced = clamp(vec2(sampleUV.x+shift,sampleUV.y),vec2(0.001),vec2(0.999));
        gl_FragColor = vec4(texture2D(frame,displaced).rgb,1.0);
      }`;
    const compile = (type,source) => {
      const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    try {
      const program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      this._gl=gl; this._program=program; this._texture=texture;
      this._strengthLocation=gl.getUniformLocation(program,'strength');
      gl.uniform1f(this._strengthLocation,0.018);
      this._resizeCanvas();
    } catch(error) {
      this._rendererFailed=true; this._emit('holo:renderer-error',{error});
    }
  }

  _resizeCanvas() {
    if(!this.canvas) return;
    const rect=this.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(rect.width*dpr)), height=Math.max(1,Math.round(rect.height*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){
      this.canvas.width=width; this.canvas.height=height;
      if(this._gl) this._gl.viewport(0,0,width,height);
    }
  }

  _startRenderer() {
    if(!this.holographic3D||this._rendererFailed||this._raf) return;
    const render=()=>{
      this._raf=0;
      if(!this.holographic3D||this.video.paused||this.video.readyState<2) return;
      this._resizeCanvas();
      try {
        const gl=this._gl;
        if(gl){
          gl.useProgram(this._program); gl.bindTexture(gl.TEXTURE_2D,this._texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.video);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        } else this._drawFallback();
        this._emit('holo:frame',{canvas:this.canvas,mode:'side-by-side'});
      } catch(error) {
        this._rendererFailed=true;
        this._emit('holo:renderer-error',{error,reason:'Video frame could not be uploaded; check cross-origin media permissions.'});
        return;
      }
      this._raf=requestAnimationFrame(render);
    };
    this._raf=requestAnimationFrame(render);
  }

  _drawFallback() {
    const ctx=this.canvas.getContext('2d');
    if(!ctx) return;
    const w=this.canvas.width,h=this.canvas.height,half=w/2;
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(this.video,0,0,half,h);
    ctx.drawImage(this.video,half,0,half,h);
  }

  _emit(name,detail={}) {
    this.dispatchEvent(new CustomEvent(name,{detail,bubbles:true,composed:true}));
  }

  async _toggleFullscreen() {
    if(!document.fullscreenElement) await this.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  get holographic3D() { return this.dataset['3d']==='true'; }
  get mediaElement() { return this.video; }
  get outputCanvas() { return this.canvas; }
  get currentTime() { return this.video.currentTime; }
  set currentTime(value) { this.video.currentTime=Number(value)||0; }
  get volume() { return this.video.volume; }
  set volume(value) { this.video.volume=Math.max(0,Math.min(1,Number(value))); }
}

if(!customElements.get('holo-video-player'))
  customElements.define('holo-video-player',HoloVideoPlayer);

export { HoloVideoPlayer };
export default HoloVideoPlayer;
