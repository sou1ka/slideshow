const { listen } = window.__TAURI__.event;
const { invoke, convertFileSrc } = window.__TAURI__.tauri;
const { open } = window.__TAURI__.dialog;
const { appDir } = window.__TAURI__.path;
const { appWindow } = window.__TAURI__.window;

let img;
let text;
let config;
let interval;
let viewfilename;
let viewfilenametitle;
let aspect;
let drawerOpen = false;
let tid;
let appTitle;
let bgcolor;

async function setConfig() {
  let con = await invoke("get_config");
  config = JSON.parse(con);
  interval = (Number(config.interval)-0.4) * 1000;
  viewfilename = Boolean(config.viewfilename);
  viewfilenametitle = Boolean(config.viewfilenametitle);
  bgcolor = config.bgcolor || '#f6f6f6';

  setFilename();
  setBgColor();

  if(Boolean(config.alwaystop)) {
    appWindow.setAlwaysOnTop(true);
  } else {
    appWindow.setAlwaysOnTop(false);
  }
}

async function setImage(imageview) {
  if(!imageview.filename) {
    openDrawer();
    return;
  }

  aspect = imageview.width/imageview.height;
  img.src = convertFileSrc(imageview.filename);
  text.textContent = imageview.filename.split(/[\\\/]/g).pop();
  setFilename();
}

async function setImageSize() {
  if(aspect >= (window.innerWidth/window.innerHeight)) {
    img.style.width = '100%';
    img.style.height = 'auto';
  } else {
    img.style.width = 'auto';
    img.style.height = '100vh';
  }
}

async function setFilename() {
  if(viewfilename) {
    text.style.display = 'block';
  } else {
    text.style.display = 'none';
  }

  if(viewfilenametitle) {
    appWindow.setTitle(text.textContent + '- ' + appTitle);
  } else {
    appWindow.setTitle(appTitle);
  }
}

async function setBgColor() {
  document.body.style.backgroundColor = bgcolor;
}

async function setImagepathValue(v, silent) {
  let t = document.querySelector('input[name=path]');
  t.value = v;
  if(silent !== true) { t.dispatchEvent(new Event('change')); }
}

async function setIntervalValue(v, silent) {
  let t = document.querySelector('input[name=interval]');
  t.value = v;
  if(silent !== true) { t.dispatchEvent(new Event('change')); }
}

async function setViewfilenameValue(v, silent) {
  let t = document.querySelector('input[name=viewfilename]');
  t.checked = v;
  if(silent !== true) { t.dispatchEvent(new Event('change')); }
}

async function setViewfilenametitleValue(v, silent) {
  let t = document.querySelector('input[name=viewfilenametitle]');
  t.checked = v;
  if(silent !== true) { t.dispatchEvent(new Event('change')); }
}

async function setAlwaystopValue(v, silent) {
  let t = document.querySelector('input[name=alwaystop]');
  t.checked = v;
  if(silent !== true) { t.dispatchEvent(new Event('change')); }
}

async function setBgcolorValue(v, silent) {
  let t = document.querySelector('input[name=bgcolor]');
  t.value = v;
  if(silent !== true) { t.dispatchEvent(new Event('change')); }
}

async function selectImagepath() {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: document.querySelector('input[name=path]').value || await appDir(),
  });

  if(selected !== null) {
    setImagepathValue(selected);
  } else if(selected === null) {
    setImagepathValue('');
  }
}

async function saveImagepath(silent) {
  await invoke('set_configjson', {
    target: document.querySelector('input[name=path]').value,
    interval: Number(document.querySelector('input[name=interval]').value),
    viewfilename: Boolean(document.querySelector('input[name=viewfilename]').checked),
    viewfilenametitle: Boolean(document.querySelector('input[name=viewfilenametitle]').checked),
    alwaystop: Boolean(document.querySelector('input[name=alwaystop]').checked),
    bgcolor: document.querySelector('input[name=bgcolor]').value,
    width: (await appWindow.isFullscreen() || await appWindow.isMaximized() ? 0 : window.innerWidth),
    height: (await appWindow.isFullscreen() || await appWindow.isMaximized() ? 0 : window.innerHeight)
  });

  setConfig();

  if(silent !== true) {
    startSlideshow();
  }
}

async function saveImagepathSilent() {
  saveImagepath(true);
}

async function startSlideshow() {
  let ret = await invoke("imageview");
  let imageview = JSON.parse(ret);
  setImage(imageview);

  listen('imageview', function(ret) {
    let imageview = JSON.parse(ret.payload);
    setImage(imageview);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  appTitle = await appWindow.title();
  img = document.querySelector('img.view');
  text = document.querySelector('p.text');
  img.addEventListener('load', () => {
    img.style.opacity = 1;
    setImageSize();
    if(tid) { clearInterval(tid); }
    tid = setTimeout(() => {
      img.style.opacity = 0;
      clearInterval(tid);
    }, interval);
  });
  img.addEventListener('mouseover', () => {
    text.style.opacity = 0.5;
  });
  img.addEventListener('mouseout', () => {
    text.style.opacity = 0;
  });

  await setConfig();
  setIntervalValue(config.interval, true);
  setImagepathValue(config.target, true);
  setViewfilenameValue(config.viewfilename, true);
  setViewfilenametitleValue(config.viewfilenametitle, true);
  setAlwaystopValue(config.viewfilename, true);
  setBgcolorValue(config.bgcolor, true);
  
  let iid = setInterval(function() {
    document.body.style.transition = 'all 0.5s ease-out';
    clearInterval(iid);
  }, 500);

  if(!config.target) {
    openDrawer();
    return;
  }

  startSlideshow();
});

window.addEventListener('resize', setImageSize);

(function() {
  let timer = 0;
  window.addEventListener('resize', function() {
    if(timer > 0) {
      this.clearTimeout(timer);
    }

    timer = setTimeout(function() {
      saveImagepathSilent();
    }, 200);
  });
})();

document.addEventListener('keydown', async function(e) {
  if(e.key == 'F5' || (e.ctrlKey && e.key == 'r') || e.key == 'F7') {
    e.preventDefault();
    e.stopPropagation();

  } else if(e.altKey && e.key == 'Enter') {
    appWindow.toggleMaximize();

  } else if(e.key == 'F11') {
    if(await appWindow.isFullscreen()) {
      appWindow.setDecorations(true);
      appWindow.setTitle(true);
      appWindow.setFullscreen(false);
    } else {
      appWindow.setDecorations(false);
      appWindow.setTitle(false);
      appWindow.setFullscreen(true);
    }
 
  } else if(e.key == 'Escape') {
    appWindow.setFullscreen(false);
    appWindow.setDecorations(true);
    appWindow.setTitle(true);
  }
});

document.querySelector('button[name=pathselect]').addEventListener('click', selectImagepath);
document.querySelector('input[name=path]').addEventListener('click', selectImagepath);
document.querySelector('input[name=path]').addEventListener('change', saveImagepath);
document.querySelector('input[name=interval]').addEventListener('change', saveImagepathSilent);
document.querySelector('input[name=viewfilename]').addEventListener('change', saveImagepathSilent);
document.querySelector('input[name=viewfilenametitle]').addEventListener('change', saveImagepathSilent);
document.querySelector('input[name=alwaystop]').addEventListener('change', saveImagepathSilent);
document.querySelector('input[name=bgcolor]').addEventListener('change', saveImagepathSilent);
document.addEventListener('selectstart', function(e) {
  e.preventDefault();
  e.stopPropagation();
});

let col = document.querySelectorAll('input[name=colorselect]');
for(let i = 0, size = col.length; i < size; i++) {
  col[i].addEventListener('change', function() {
    setBgcolorValue(this.value, false);
  });
}

(function () {
  const drawer = document.querySelector(".js-drawer");
  const backdrop = drawer.querySelector(".js-backdrop");

  backdrop.addEventListener("click", closeDrawer, false);
  document.addEventListener('contextmenu', function(e) {
    openDrawer();
    e.preventDefault();
    e.stopPropagation();
  }, false);
})();

function changeAriaExpanded(state) {
  const value = state ? "true" : "false";
  drawer.setAttribute("aria-expanded", value);
}

function changeState(state) {
  if(state === drawerOpen) {
    return;
  }
  changeAriaExpanded(state);
  drawerOpen = state;
}

function openDrawer() {
  changeState(true);
}

function closeDrawer() {
  changeState(false);
}