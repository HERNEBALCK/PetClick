using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

// Only physical key identifiers and transitions cross the private stdout pipe.
// There is no text conversion, file output, input blocking or networking.
internal static class KeyboardBridge {
    private delegate IntPtr HookProc(int code, IntPtr wParam, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)] private struct KeyData { public uint vk, scan, flags, time; public UIntPtr extra; }
    [DllImport("user32.dll", SetLastError=true)] private static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr module, uint thread);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("kernel32.dll", CharSet=CharSet.Auto)] private static extern IntPtr GetModuleHandle(string name);
    private static readonly BlockingCollection<string> Output = new BlockingCollection<string>(4096);
    private static readonly HashSet<uint> Pressed = new HashSet<uint>();
    private static readonly HookProc Callback = OnKey;
    private static IntPtr hook;
    private static IntPtr OnKey(int code, IntPtr w, IntPtr l) {
        if (code >= 0) {
            int message = w.ToInt32();
            if (message == 0x100 || message == 0x101 || message == 0x104 || message == 0x105) {
                KeyData data = (KeyData)Marshal.PtrToStructure(l, typeof(KeyData));
                bool down = message == 0x100 || message == 0x104;
                bool extended = (data.flags & 1) != 0;
                uint identity = data.scan | (extended ? 256u : 0u) | (data.vk == 19 ? 512u : 0u);
                bool changed = data.vk == 19 ? down : (down ? Pressed.Add(identity) : Pressed.Remove(identity));
                if (changed) Output.TryAdd("{\"type\":\"key\",\"scan\":" + data.scan + ",\"vk\":" + data.vk + ",\"extended\":" + (extended ? "true" : "false") + ",\"down\":" + (down ? "true" : "false") + "}");
            }
        }
        return CallNextHookEx(hook, code, w, l);
    }
    [STAThread] private static void Main(string[] args) {
        int parentId;
        if (args.Length != 1 || !Int32.TryParse(args[0], out parentId)) return;
        Process parent;
        try { parent = Process.GetProcessById(parentId); } catch { return; }
        var writer = new Thread(() => {
            try {
                using (var stream = new System.IO.StreamWriter(Console.OpenStandardOutput())) {
                    stream.AutoFlush = true;
                    foreach (string line in Output.GetConsumingEnumerable()) stream.WriteLine(line);
                }
            } catch { Application.Exit(); }
        });
        writer.IsBackground = true; writer.Start();
        hook = SetWindowsHookEx(13, Callback, GetModuleHandle(null), 0);
        if (hook == IntPtr.Zero) { Output.TryAdd("{\"type\":\"error\",\"error\":\"keyboard_hook_failed\"}"); Output.CompleteAdding(); writer.Join(500); return; }
        Output.TryAdd("{\"type\":\"ready\"}");
        var watcher = new Thread(() => { try { parent.WaitForExit(); } catch {} Application.Exit(); });
        watcher.IsBackground = true; watcher.Start();
        var stdin = new Thread(() => { try { while (Console.ReadLine() != null) {} } catch {} Application.Exit(); });
        stdin.IsBackground = true; stdin.Start();
        try { Application.Run(); }
        finally { UnhookWindowsHookEx(hook); Output.CompleteAdding(); writer.Join(500); }
    }
}
