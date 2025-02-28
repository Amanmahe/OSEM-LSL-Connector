use std::sync::{Arc, Mutex};
use std::sync::mpsc::{self, Sender};
use tauri::AppHandle;
use lsl::{StreamInfo, StreamOutlet, Pushable};
use lazy_static::lazy_static;

// Create separate Mutex-protected Senders for two streams
lazy_static! {
    static ref TX1: Mutex<Option<Sender<Vec<i32>>>> = Mutex::new(None);
    static ref TX2: Mutex<Option<Sender<Vec<i32>>>> = Mutex::new(None);
}

#[tauri::command]
async fn start_streaming_1(channel_data: Vec<i32>, _app_handle: AppHandle) {
    println!("Stream 1 received data: {:?}", channel_data);
    if let Some(tx) = TX1.lock().unwrap().as_ref() {
        if let Err(err) = tx.send(channel_data) {
            println!("Failed to send data to LSL Stream 1: {:?}", err);
        }
    }
}

#[tauri::command]
async fn start_streaming_2(channel_data: Vec<i32>, _app_handle: AppHandle) {
    println!("Stream 2 received data: {:?}", channel_data);
    if let Some(tx) = TX2.lock().unwrap().as_ref() {
        if let Err(err) = tx.send(channel_data) {
            println!("Failed to send data to LSL Stream 2: {:?}", err);
        }
    }
}

fn main() {
    // Create channels for both LSL streams
    let (tx1, rx1) = mpsc::channel::<Vec<i32>>();
    let (tx2, rx2) = mpsc::channel::<Vec<i32>>();

    *TX1.lock().unwrap() = Some(tx1);
    *TX2.lock().unwrap() = Some(tx2);

    // Spawn first LSL stream thread
    std::thread::spawn(move || {
        let info = Arc::new(
            StreamInfo::new("ORIC-OSEM-1", "EXG", 8, 2000.0, lsl::ChannelFormat::Int32, "oric-1")
                .unwrap(),
        );
        let outlet = Arc::new(Mutex::new(StreamOutlet::new(&info, 0, 360).unwrap()));

        while let Ok(channel_data) = rx1.recv() {
            if let Ok(outlet) = outlet.lock() {
                outlet.push_sample(&channel_data).unwrap_or_else(|e| {
                    println!("Failed to push data to LSL Stream 1: {:?}", e);
                });
            }
        }
    });

    // Spawn second LSL stream thread
    std::thread::spawn(move || {
        let info = Arc::new(
            StreamInfo::new("ORIC-OSEM-2", "EXG", 8, 2000.0, lsl::ChannelFormat::Int32, "oric-2")
                .unwrap(),
        );
        let outlet = Arc::new(Mutex::new(StreamOutlet::new(&info, 0, 360).unwrap()));

        while let Ok(channel_data) = rx2.recv() {
            if let Ok(outlet) = outlet.lock() {
                outlet.push_sample(&channel_data).unwrap_or_else(|e| {
                    println!("Failed to push data to LSL Stream 2: {:?}", e);
                });
            }
        }
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_streaming_1, start_streaming_2])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
