fn main() {
    // GetSystemTimePreciseAsFileTime was added in Windows 8; provide a fallback
    // so the app loads on Windows 7 (tokio imports it statically via mio).
    #[cfg(target_os = "windows")]
    println!("cargo:rustc-link-arg=/ALTERNATENAME:GetSystemTimePreciseAsFileTime=GetSystemTimeAsFileTime");

    tauri_build::build()
}
