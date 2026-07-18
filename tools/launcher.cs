// ХЕ.Дневник — desktop launcher.
// Runs without any console window (/target:winexe):
//  1. Starts the API and web servers hidden (unless already running).
//  2. Opens the app in a dedicated chromeless window (Chrome/Edge --app mode)
//     with its own profile, so it looks and behaves like a standalone program.
//  3. When the app window is closed, stops the server process trees it started.
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

class Launcher
{
    static Process serverProc, clientProc;
    static bool weStartedServers = false;

    [STAThread]
    static void Main()
    {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string npm = @"C:\Program Files\nodejs\npm.cmd";
        if (!File.Exists(npm)) npm = "npm.cmd"; // fall back to PATH

        try
        {
            if (!PortOpen(5173))
            {
                weStartedServers = true;
                serverProc = StartNpm(npm, Path.Combine(baseDir, "server"));
                clientProc = StartNpm(npm, Path.Combine(baseDir, "client"));

                bool ok = false;
                for (int i = 0; i < 120; i++)
                {
                    if (PortOpen(5173) && PortOpen(4000)) { ok = true; break; }
                    Thread.Sleep(1000);
                }
                if (!ok)
                {
                    KillServers();
                    MessageBox.Show(
                        "Не удалось запустить серверы приложения за 2 минуты.\n" +
                        "Проверьте, что установлены Node.js и PostgreSQL (подробнее — README.md).",
                        "ХЕ.Дневник", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                Thread.Sleep(1000); // let vite finish warming up
            }

            string browser = FindBrowser();
            if (browser == null)
            {
                MessageBox.Show(
                    "Не найден Google Chrome или Microsoft Edge — нужен один из них для окна приложения.",
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
                    "--app=http://localhost:5173" +
                    " --user-data-dir=\"" + profileDir + "\"" +
                    " --window-size=1280,860" +
                    " --no-first-run --no-default-browser-check",
                UseShellExecute = false,
            };
            var appWindow = Process.Start(psi);
            if (appWindow != null)
            {
                appWindow.WaitForExit();
            }
        }
        finally
        {
            if (weStartedServers) KillServers();
        }
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

    static Process StartNpm(string npm, string workDir)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c \"\"" + npm + "\" run dev\"",
            WorkingDirectory = workDir,
            CreateNoWindow = true,
            UseShellExecute = false,
        };
        return Process.Start(psi);
    }

    static void KillServers()
    {
        foreach (var p in new[] { serverProc, clientProc })
        {
            if (p == null) continue;
            try
            {
                if (!p.HasExited)
                {
                    var kill = new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = "/PID " + p.Id + " /T /F",
                        CreateNoWindow = true,
                        UseShellExecute = false,
                    };
                    var kp = Process.Start(kill);
                    if (kp != null) kp.WaitForExit(5000);
                }
            }
            catch { }
        }
    }

    static bool PortOpen(int port)
    {
        try
        {
            using (var client = new TcpClient())
            {
                var result = client.BeginConnect("127.0.0.1", port, null, null);
                bool success = result.AsyncWaitHandle.WaitOne(500);
                if (success && client.Connected)
                {
                    client.EndConnect(result);
                    return true;
                }
                return false;
            }
        }
        catch
        {
            return false;
        }
    }
}
