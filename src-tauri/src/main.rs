// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::LogicalSize;
use tauri::Size;

use std::env;
use std::io;
use std::io::Write;
use std::fs;
use std::path::Path;
use std::collections::HashMap;
use rand::Rng;
use std::sync::RwLock;

use serde::{Serialize, Deserialize};
use imagesize;

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    target: String,
    interval: u64,
    viewfilename: bool,
    width: u32,
    height: u32
}

static SELECT_IMAGE: RwLock<String> = RwLock::new(String::new());

#[tauri::command]
fn imageview() -> String {
    let config = get_configjson();
    let mut file: HashMap<&str, String> = HashMap::new();
    let path = config.target;
    let select_image: String = SELECT_IMAGE.read().unwrap().to_string();

    if &path != "" {
        let lists: Vec<String> = read_dir(&path).unwrap();
        let mut rng = rand::thread_rng();

       loop {
            let num = rng.gen_range(0..(lists.len()-1));
            let filepath = format!("{}\\{}", &path, lists.get(num).unwrap().to_string());

            if filepath == select_image {
                continue;
            }

            let size = imagesize::size(&filepath).unwrap();
            file.insert("filename", filepath.to_string());
            file.insert("width", size.width.to_string());
            file.insert("height", size.height.to_string());
            *SELECT_IMAGE.write().unwrap() = filepath.to_string();
            break;
        }
    }

    format!("{}", serde_json::to_string(&file).unwrap())
}

#[tauri::command]
fn get_config() -> String {
    let conf: Config = get_configjson();

    format!("{}", serde_json::to_string(&conf).unwrap())
}

#[tauri::command]
fn set_configjson(target: String, interval: u64, viewfilename: bool, width: u32, height: u32) {
    let res = Config {
        target: target,
        interval: interval,
        viewfilename: viewfilename,
        width: width,
        height: height
    };
    let json = serde_json::to_string(&res).unwrap();
    let mut f = fs::File::create("slideshow.json").unwrap();
    f.write_all(json.as_bytes()).unwrap();
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![imageview, get_config, set_configjson])
        .setup(|app| {
            let config = get_configjson();
            let window = app.app_handle().get_window("main").unwrap();
            window.set_size(Size::Logical(LogicalSize { width: config.width as f64, height: config.height as f64})).unwrap();

            let app_handle = app.app_handle();
            std::thread::spawn(move || loop {
                let config = get_configjson();
                let interval: u64 = config.interval;
                app_handle.emit_all("imageview", imageview()).unwrap();
                std::thread::sleep(std::time::Duration::from_secs(interval));
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn read_dir<P: AsRef<Path>>(path: P) -> io::Result<Vec<String>> {
    Ok(fs::read_dir(path)?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            if entry.file_type().ok()?.is_file() {
                Some(entry.file_name().to_string_lossy().into_owned())
            } else {
                None
            }
        })
        .collect())
}

fn get_configjson() -> Config {
    let file = fs::read_to_string("slideshow.json");
    let mut res = Config {
        target: String::from(""),
        interval: 30,
        viewfilename: false,
        width: 800,
        height: 600
    };

    match file {
        Ok(val) => {
            let tmp: Config = serde_json::from_str(&val).unwrap();
            res.target = tmp.target;
            res.interval = tmp.interval;
            res.viewfilename = tmp.viewfilename;
            res.width = tmp.width;
            res.height = tmp.height;
        },
        Err(_) => {},
    }

    return res;
}