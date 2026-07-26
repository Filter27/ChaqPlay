use serde::Serialize;
use serde_json::Value;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, Wry,
};

// yt-dlp se agrega al ejecutable durante la compilación. En tiempo de
// ejecución se extrae en la carpeta privada de datos de la aplicación, de modo
// que la distribución portable solo necesita ChaqPlay.exe.
#[cfg(target_os = "windows")]
const YTDLP_BYTES: &[u8] =
    include_bytes!("../binaries/yt-dlp-x86_64-pc-windows-msvc.exe");

/// Referencia al elemento marcado del menú de bandeja. Guardarla como estado
/// permite mantener sincronizado el check cuando el cambio nace en React.
struct TrayMenuState {
    spectrum: CheckMenuItem<Wry>,
    hide_on_minimize: CheckMenuItem<Wry>,
    pinned: CheckMenuItem<Wry>,
    style_bars: CheckMenuItem<Wry>,
    style_wave: CheckMenuItem<Wry>,
    style_pulse: CheckMenuItem<Wry>,
    language_es: CheckMenuItem<Wry>,
    language_en: CheckMenuItem<Wry>,
    spectrum_menu: Submenu<Wry>,
    language_menu: Submenu<Wry>,
    about_menu: Submenu<Wry>,
    github: MenuItem<Wry>,
    donate: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Track {
    id: String,
    title: String,
    artist: String,
    duration: Option<f64>,
    thumbnail: String,
    source: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StreamInfo {
    url: String,
    kind: &'static str,
    duration: Option<f64>,
}

async fn run_ytdlp(app: &AppHandle, args: Vec<String>) -> Result<String, String> {
    let executable = locate_ytdlp(app)?;
    let output = tauri::async_runtime::spawn_blocking(move || {
        let mut command = std::process::Command::new(executable);
        command.args(args);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            // CREATE_NO_WINDOW: evita que yt-dlp abra una consola visible.
            command.creation_flags(0x08000000);
        }
        command.output()
    })
    .await
    .map_err(|error| format!("El proceso de YouTube se interrumpió: {error}"))?
    .map_err(|error| format!("yt-dlp no respondió: {error}"))?;

    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if detail.is_empty() {
            "YouTube no pudo procesar esta solicitud.".to_string()
        } else {
            format!("YouTube no pudo procesar esta solicitud: {detail}")
        });
    }

    String::from_utf8(output.stdout)
        .map_err(|_| "yt-dlp devolvió una respuesta que no se pudo leer.".to_string())
}

#[cfg(target_os = "windows")]
fn locate_ytdlp(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let engine_directory = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("No se pudo preparar el motor de YouTube: {error}"))?
        .join("engine");
    let executable = engine_directory.join("media-engine.exe");

    // Se vuelve a extraer únicamente cuando falta o cuando una compilación
    // nueva contiene una versión de tamaño diferente.
    let requires_extract = std::fs::metadata(&executable)
        .map(|metadata| metadata.len() != YTDLP_BYTES.len() as u64)
        .unwrap_or(true);
    if requires_extract {
        std::fs::create_dir_all(&engine_directory)
            .map_err(|error| format!("No se pudo crear la carpeta del motor: {error}"))?;
        std::fs::write(&executable, YTDLP_BYTES)
            .map_err(|error| format!("No se pudo preparar el motor integrado: {error}"))?;
    }

    Ok(executable)
}

#[cfg(not(target_os = "windows"))]
fn locate_ytdlp(_app: &AppHandle) -> Result<std::path::PathBuf, String> {
    Err("ChaqPlay está diseñado actualmente para Windows.".to_string())
}

fn text_field(value: &Value, names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        value
            .get(*name)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(ToString::to_string)
    })
}

#[tauri::command]
async fn search_youtube(app: AppHandle, query: String) -> Result<Vec<Track>, String> {
    let query = query.trim();
    if !(2..=120).contains(&query.chars().count()) {
        return Err("La búsqueda debe tener entre 2 y 120 caracteres.".to_string());
    }

    let output = run_ytdlp(
        &app,
        vec![
            "--ignore-config".into(),
            "--no-warnings".into(),
            "--flat-playlist".into(),
            "--dump-single-json".into(),
            "--playlist-end".into(),
            "18".into(),
            format!("ytsearch18:{query}"),
        ],
    )
    .await?;

    let payload: Value = serde_json::from_str(output.trim())
        .map_err(|_| "No se pudieron interpretar los resultados de YouTube.".to_string())?;

    let entries = payload
        .get("entries")
        .and_then(Value::as_array)
        .ok_or_else(|| "YouTube no devolvió resultados.".to_string())?;

    Ok(entries
        .iter()
        .filter_map(|entry| {
            let id = text_field(entry, &["id"])?;
            let title = text_field(entry, &["title"]).unwrap_or_else(|| "Sin título".to_string());
            let artist = text_field(entry, &["channel", "uploader", "channel_id"])
                .unwrap_or_else(|| "YouTube".to_string());
            let duration = entry.get("duration").and_then(Value::as_f64);
            let thumbnail = format!("https://i.ytimg.com/vi/{id}/hqdefault.jpg");

            Some(Track {
                id,
                title,
                artist,
                duration,
                thumbnail,
                source: "youtube",
            })
        })
        .collect())
}

#[tauri::command]
async fn resolve_youtube(
    app: AppHandle,
    video_id: String,
    attempt: u8,
) -> Result<StreamInfo, String> {
    if video_id.len() != 11
        || !video_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_')
    {
        return Err("El identificador del video no es válido.".to_string());
    }

    // No descargamos la canción completa. yt-dlp resuelve una URL multimedia
    // temporal y WebView2 la reproduce progresivamente, igual que un servicio
    // de streaming: comienza con un búfer pequeño y carga el resto al avanzar.
    // Se prueban primero los contenedores directos que WebView2 reproduce con
    // menos trabajo. HLS se reserva como último recurso y React lo procesa con
    // hls.js, cargado dinámicamente solo para las canciones que lo necesiten.
    let (format, kind) = match attempt {
        0 => ("bestaudio[protocol=https][ext=m4a]/bestaudio[protocol=http][ext=m4a]", "direct"),
        1 => ("bestaudio[protocol=https][ext=webm]/bestaudio[protocol=http][ext=webm]", "direct"),
        _ => ("bestaudio[protocol*=m3u8]/best[protocol*=m3u8]", "hls"),
    };
    let output = run_ytdlp(
        &app,
        vec![
            "--ignore-config".into(),
            "--no-warnings".into(),
            "--no-playlist".into(),
            "--no-download".into(),
            "--format".into(),
            format.into(),
            "--get-url".into(),
            format!("https://www.youtube.com/watch?v={video_id}"),
        ],
    )
    .await?;
    let url = output
        .lines()
        .map(str::trim)
        .find(|line| line.starts_with("https://"))
        .map(ToString::to_string)
        .ok_or_else(|| "YouTube no entregó un enlace de audio compatible.".to_string())?;

    Ok(StreamInfo {
        url,
        kind,
        duration: None,
    })
}

#[tauri::command]
fn hide_on_minimize_enabled(state: State<'_, TrayMenuState>) -> bool {
    state.hide_on_minimize.is_checked().unwrap_or(true)
}

#[tauri::command]
fn set_spectrum_visible(
    app: AppHandle,
    state: State<'_, TrayMenuState>,
    visible: bool,
) -> Result<(), String> {
    state
        .spectrum
        .set_checked(visible)
        .map_err(|error| format!("No se pudo actualizar el menú: {error}"))?;
    set_window_visible(&app, "spectrum", visible, false);
    let _ = app.emit("spectrum-visibility", visible);
    Ok(())
}

#[tauri::command]
fn sync_language(app: AppHandle, state: State<'_, TrayMenuState>, language: String) {
    select_language(&app, state.inner(), &language);
}

#[tauri::command]
fn sync_spectrum_preferences(
    app: AppHandle,
    state: State<'_, TrayMenuState>,
    style: String,
    pinned: bool,
) -> Result<(), String> {
    state
        .pinned
        .set_checked(pinned)
        .map_err(|error| format!("No se pudo restaurar la opción fijar: {error}"))?;
    if let Some(window) = app.get_webview_window("spectrum") {
        let _ = window.set_always_on_top(pinned);
    }
    set_style_checks(state.inner(), &style);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Debe registrarse antes que cualquier otro complemento. Si Windows intenta
    // abrir ChaqPlay otra vez, la segunda instancia termina y esta recupera la
    // ventana que ya estaba reproduciendo.
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .invoke_handler(tauri::generate_handler![
            search_youtube,
            resolve_youtube,
            hide_on_minimize_enabled,
            set_spectrum_visible,
            sync_spectrum_preferences,
            sync_language
        ])
        .setup(|app| {
            let spectrum = CheckMenuItem::with_id(
                app,
                "spectrum",
                "Mostrar espectro",
                true,
                false,
                None::<&str>,
            )?;
            let hide_on_minimize = CheckMenuItem::with_id(
                app,
                "hide_on_minimize",
                "Ocultar ChaqPlay al minimizar",
                true,
                true,
                None::<&str>,
            )?;
            let pinned = CheckMenuItem::with_id(
                app,
                "pinned",
                "Fijar espectro sobre las ventanas",
                true,
                true,
                None::<&str>,
            )?;
            let style_bars = CheckMenuItem::with_id(
                app,
                "style_bars",
                "Espectro: Líneas",
                true,
                true,
                None::<&str>,
            )?;
            let style_wave = CheckMenuItem::with_id(
                app,
                "style_wave",
                "Espectro: Onda",
                true,
                false,
                None::<&str>,
            )?;
            let style_pulse = CheckMenuItem::with_id(
                app,
                "style_pulse",
                "Espectro: Pulso",
                true,
                false,
                None::<&str>,
            )?;
            let spectrum_menu = Submenu::with_id_and_items(
                app,
                "spectrum_menu",
                "Opciones del espectro",
                true,
                &[&pinned, &style_bars, &style_wave, &style_pulse],
            )?;
            let language_es = CheckMenuItem::with_id(
                app,
                "language_es",
                "Español",
                true,
                true,
                None::<&str>,
            )?;
            let language_en = CheckMenuItem::with_id(
                app,
                "language_en",
                "English",
                true,
                false,
                None::<&str>,
            )?;
            let language_menu = Submenu::with_id_and_items(
                app,
                "language_menu",
                "Idioma",
                true,
                &[&language_es, &language_en],
            )?;
            let github = MenuItem::with_id(
                app,
                "github",
                "Ver proyecto en GitHub",
                true,
                None::<&str>,
            )?;
            let donate = MenuItem::with_id(
                app,
                "donate",
                "Apoyar el proyecto",
                true,
                None::<&str>,
            )?;
            let about_menu = Submenu::with_id_and_items(
                app,
                "about_menu",
                "ChaqPlay v1.0",
                true,
                &[&github, &donate],
            )?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &spectrum,
                    &hide_on_minimize,
                    &spectrum_menu,
                    &language_menu,
                    &about_menu,
                    &quit,
                ],
            )?;

            app.manage(TrayMenuState {
                spectrum: spectrum.clone(),
                hide_on_minimize: hide_on_minimize.clone(),
                pinned: pinned.clone(),
                style_bars: style_bars.clone(),
                style_wave: style_wave.clone(),
                style_pulse: style_pulse.clone(),
                language_es: language_es.clone(),
                language_en: language_en.clone(),
                spectrum_menu: spectrum_menu.clone(),
                language_menu: language_menu.clone(),
                about_menu: about_menu.clone(),
                github: github.clone(),
                donate: donate.clone(),
                quit: quit.clone(),
            });

            let mut tray = TrayIconBuilder::new()
                .tooltip("ChaqPlay")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let state = app.state::<TrayMenuState>();
                    match event.id.as_ref() {
                        "spectrum" => {
                            let visible = state.spectrum.is_checked().unwrap_or(false);
                            set_window_visible(app, "spectrum", visible, false);
                            let _ = app.emit("spectrum-visibility", visible);
                        }
                        "pinned" => {
                            let pinned = state.pinned.is_checked().unwrap_or(true);
                            if let Some(window) = app.get_webview_window("spectrum") {
                                let _ = window.set_always_on_top(pinned);
                            }
                            let _ = app.emit("spectrum-pinned", pinned);
                        }
                        "style_bars" => {
                            select_spectrum_style(app, state.inner(), "bars")
                        }
                        "style_wave" => {
                            select_spectrum_style(app, state.inner(), "wave")
                        }
                        "style_pulse" => {
                            select_spectrum_style(app, state.inner(), "pulse")
                        }
                        "language_es" => select_language(app, state.inner(), "es"),
                        "language_en" => select_language(app, state.inner(), "en"),
                        "github" => open_external_url("https://github.com/Filter27/ChaqPlay"),
                        "donate" => open_external_url("https://paypal.me/Filter27"),
                        "hide_on_minimize" => {},
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ChaqPlay");
}

fn select_spectrum_style(app: &AppHandle, state: &TrayMenuState, style: &str) {
    set_style_checks(state, style);
    let _ = app.emit("spectrum-style", style);
}

fn set_style_checks(state: &TrayMenuState, style: &str) {
    let _ = state.style_bars.set_checked(style == "bars");
    let _ = state.style_wave.set_checked(style == "wave");
    let _ = state.style_pulse.set_checked(style == "pulse");
}

/// Mantiene mutuamente excluyentes las opciones de idioma y actualiza todo el
/// menú nativo. React recibe el mismo cambio para traducir la interfaz visual.
fn select_language(app: &AppHandle, state: &TrayMenuState, language: &str) {
    let english = language == "en";
    let _ = state.language_es.set_checked(!english);
    let _ = state.language_en.set_checked(english);
    let _ = state.spectrum.set_text(if english { "Show spectrum" } else { "Mostrar espectro" });
    let _ = state.hide_on_minimize.set_text(if english {
        "Hide ChaqPlay when minimized"
    } else {
        "Ocultar ChaqPlay al minimizar"
    });
    let _ = state.spectrum_menu.set_text(if english { "Spectrum options" } else { "Opciones del espectro" });
    let _ = state.pinned.set_text(if english { "Keep spectrum on top" } else { "Fijar espectro sobre las ventanas" });
    let _ = state.style_bars.set_text(if english { "Lines" } else { "Líneas" });
    let _ = state.style_wave.set_text(if english { "Wave" } else { "Onda" });
    let _ = state.style_pulse.set_text(if english { "Pulse" } else { "Pulso" });
    let _ = state.language_menu.set_text(if english { "Language" } else { "Idioma" });
    let _ = state.about_menu.set_text("ChaqPlay v1.0");
    let _ = state.github.set_text(if english { "View project on GitHub" } else { "Ver proyecto en GitHub" });
    let _ = state.donate.set_text(if english { "Support the project" } else { "Apoyar el proyecto" });
    let _ = state.quit.set_text(if english { "Quit" } else { "Salir" });
    let _ = app.emit("app-language", if english { "en" } else { "es" });
}

/// Los únicos enlaces aceptados son constantes del propio programa. En
/// Windows `start` abre el navegador predeterminado sin mostrar una consola.
fn open_external_url(url: &'static str) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut command = std::process::Command::new("cmd");
        command
            .args(["/C", "start", "", url])
            .creation_flags(0x08000000);
        let _ = command.spawn();
    }
}

/// Muestra u oculta cualquiera de las dos ventanas sin alterar la otra.
fn set_window_visible(app: &AppHandle, label: &str, visible: bool, focus: bool) {
    if let Some(window) = app.get_webview_window(label) {
        if visible {
            let _ = window.unminimize();
            let _ = window.show();
            if focus {
                let _ = window.set_focus();
            }
        } else {
            let _ = window.hide();
        }
    }
}

/// Restaura una ventana oculta o minimizada. Se reutiliza desde la bandeja y
/// desde el controlador de instancia única.
fn show_main_window(app: &AppHandle) {
    set_window_visible(app, "main", true, true);
}

#[cfg(test)]
mod tests {
    use super::text_field;
    use serde_json::json;

    #[test]
    fn text_field_uses_the_first_available_name() {
        let value = json!({ "channel": "Canal", "uploader": "Autor" });
        assert_eq!(text_field(&value, &["missing", "channel"]), Some("Canal".into()));
    }
}
