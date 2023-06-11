const { listen } = window.__TAURI__.event;
const { invoke, convertFileSrc } = window.__TAURI__.tauri;
const { open } = window.__TAURI__.dialog;
const { appDir } = window.__TAURI__.path;

let img;
let text;
let config;
let interval;
let viewfilename;
let aspect;
let drawerOpen = false;
let tid;

async function setConfig() {
  let con = await invoke("get_config");
  config = JSON.parse(con);
  interval = (Number(config.interval)-0.4) * 1000;
  viewfilename = Boolean(config.viewfilename);

  if(viewfilename) {
    text.style.display = 'block';
  } else {
    text.style.display = 'none';
  }
}

async function setImage(imageview) {
  if(!imageview.filename) {
    openDrawer();
    return;
  }

  aspect = imageview.width/imageview.height;
  img.src = convertFileSrc(imageview.filename);
  text.textContent = imageview.filename;
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
    width: window.innerWidth,
    height: window.innerHeight
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

document.addEventListener('keydown', function(e) {
  if(e.key == 'F5' || (e.ctrlKey && e.key == 'r')) {
    e.preventDefault();
    e.stopPropagation();
  }
});

document.querySelector('button[name=pathselect]').addEventListener('click', selectImagepath);
document.querySelector('input[name=path]').addEventListener('click', selectImagepath);
document.querySelector('input[name=path]').addEventListener('change', saveImagepath);
document.querySelector('input[name=interval]').addEventListener('change', saveImagepathSilent);
document.querySelector('input[name=viewfilename]').addEventListener('change', saveImagepathSilent);
document.addEventListener('selectstart', function(e) {
  e.preventDefault();
  e.stopPropagation();
});

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