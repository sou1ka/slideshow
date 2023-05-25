const { listen } = window.__TAURI__.event;
const { invoke, convertFileSrc } = window.__TAURI__.tauri;

let img;
let text;
let interval;
let aspect;

async function setImage(conf) {
  aspect = conf.width/conf.height;
  img.src = convertFileSrc(conf.filename);
  text.textContent = conf.filename;
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

window.addEventListener("DOMContentLoaded", async () => {
  img = document.querySelector('img.view');
  text = document.querySelector('p.text');
  img.addEventListener('load', () => {
    img.style.opacity = 1;
    setImageSize();
    let tid;
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

  let ret = await invoke("imageview");
  let conf = JSON.parse(ret);
  interval = (Number(conf.interval)-0.4) * 1000;
  setImage(conf);

  listen('imageview', function(ret) {
    let conf = JSON.parse(ret.payload);
    setImage(conf);
  });
});

window.addEventListener('resize', setImageSize);

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener('keydown', function(e) {
  if(e.key == 'F5' || (e.ctrlKey && e.key == 'r')) {
    e.preventDefault();
    e.stopPropagation();
  }
});

