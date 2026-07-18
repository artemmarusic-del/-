// ХЕ.Дневник — desktop launcher (cloud edition).
// Opens the cloud app (https://xe-dnevnik.onrender.com) in a dedicated
// chromeless window (Chrome/Edge --app mode) with its own profile, so it
// looks and behaves like a standalone program and shares one account/database
// with every other device. No local servers or database are started.
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Launcher
{
    const string AppUrl = "https://xe-dnevnik.onrender.com";

    [STAThread]
    static void Main()
    {
        string browser = FindBrowser();
        if (browser == null)
        {
            MessageBox.Show(
                "Не найден Google Chrome или Microsoft Edge — нужен один из них для окна приложения.\n" +
                "Как запасной вариант можно открыть сайт в любом браузере:\n" + AppUrl,
                "ХЕ.Дневник", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        string profileDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "XE-Dnevnik", "AppWindow");
        Directory.CreateDirectory(profileDir);

        var psi = new ProcessStartInfo
        {
            FileName = browser,
            Arguments =
                "--app=" + AppUrl +
                " --user-data-dir=\"" + profileDir + "\"" +
                " --window-size=1280,860" +
                " --no-first-run --no-default-browser-check",
            UseShellExecute = false,
        };

        try
        {
            Process.Start(psi);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Не удалось открыть окно приложения: " + ex.Message,
                "ХЕ.Дневник", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        // The launcher exits immediately; the app window keeps running on its own.
    }

    static string FindBrowser()
    {
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] candidates =
        {
            @"C:\Program Files\Google\Chrome\Application\chrome.exe",
            @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
            @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        };
        foreach (string path in candidates)
        {
            if (File.Exists(path)) return path;
        }
        return null;
    }
}
