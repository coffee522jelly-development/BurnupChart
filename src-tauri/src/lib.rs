// Tauriコマンドの詳細についてはこちらを参照してください: https://tauri.app/develop/calling-rust/

/// フロントエンドから呼び出し可能なサンプルコマンド
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Rustから挨拶が届きました！", name)
}

/// アプリケーションのエントリーポイント
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Tauriビルダーを使用してアプリケーションを構成します
    tauri::Builder::default()
        // システムのデフォルトブラウザなどでURLを開くためのプラグインを初期化
        .plugin(tauri_plugin_opener::init())
        // 定義したコマンドを登録し、フロントエンドから呼び出せるようにします
        .invoke_handler(tauri::generate_handler![greet])
        // アプリケーションを実行します
        .run(tauri::generate_context!())
        // 実行中に致命的なエラーが発生した場合のメッセージ
        .expect("Tauriアプリケーションの実行中にエラーが発生しました");
}
