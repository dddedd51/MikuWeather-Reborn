using System;
using System.Globalization;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;
using Point = System.Drawing.Point;
using Size = System.Drawing.Size;
using Windows.Devices.Geolocation;
using Windows.Foundation;

// One foreground request. Coordinates are rounded before crossing the process boundary.
internal static class MikuLocation {
    [STAThread]
    private static int Main(string[] args) {
        bool allowApproximate = args.Length == 1 && args[0] == "--approximate";
        IAsyncOperation<GeolocationAccessStatus> access = null;
        IAsyncOperation<Geoposition> request = null;
        bool emitted = false;
        try {
            Application.EnableVisualStyles();
            using (var form = new Form())
            using (var timer = new System.Windows.Forms.Timer()) {
                form.Text = allowApproximate ? "初音天气 · 系统大致位置" : "初音天气 · 系统定位";
                form.ClientSize = new Size(360,135);
                form.FormBorderStyle = FormBorderStyle.FixedDialog;
                form.MaximizeBox = false; form.MinimizeBox = false;
                form.StartPosition = FormStartPosition.CenterScreen;
                form.Font = new Font("Microsoft YaHei UI",9);
                var label = new Label { Text = "正在请求 Windows 系统位置…\n只用于本机匹配城市，不记录、不上传坐标。", Location = new Point(18,18), Size = new Size(324,58) };
                var cancel = new Button { Text = "取消", Location = new Point(258,92), Size = new Size(84,28) };
                form.Controls.Add(label); form.Controls.Add(cancel);
                DateTime stopAt = DateTime.UtcNow.AddSeconds(24);
                Action<string> finish = delegate(string json) {
                    if (emitted) return; emitted = true; timer.Stop(); Console.WriteLine(json); form.Close();
                };
                Action<string> fail = delegate(string code) { finish("{\"ok\":false,\"code\":\"" + code + "\"}"); };
                cancel.Click += delegate { fail("CANCELLED"); };
                form.FormClosing += delegate {
                    timer.Stop();
                    if (access != null) { try { access.Cancel(); access.Close(); } catch { } }
                    if (request != null) { try { request.Cancel(); request.Close(); } catch { } }
                    if (!emitted) { emitted = true; WriteError("CANCELLED"); }
                };
                form.Shown += delegate {
                    try { form.Activate(); access = Geolocator.RequestAccessAsync(); timer.Start(); }
                    catch (UnauthorizedAccessException) { fail("DENIED"); }
                    catch { fail("UNAVAILABLE"); }
                };
                timer.Interval = 100;
                timer.Tick += delegate {
                    try {
                        if (DateTime.UtcNow >= stopAt) { fail("TIMEOUT"); return; }
                        if (access != null) {
                            if (access.Status == AsyncStatus.Started) return;
                            if (access.Status != AsyncStatus.Completed || access.GetResults() != GeolocationAccessStatus.Allowed) { fail("DENIED"); return; }
                            access.Close(); access = null;
                            var locator = new Geolocator { DesiredAccuracy = allowApproximate ? PositionAccuracy.Default : PositionAccuracy.High };
                            if (!allowApproximate) locator.DesiredAccuracyInMeters = 1000;
                            request = locator.GetGeopositionAsync(TimeSpan.Zero,TimeSpan.FromSeconds(18));
                            label.Text = allowApproximate ? "正在获取系统大致位置，可能来自 IP…\n可能偏到另一座城市，请自行确认。" : "正在获取更新、更可靠的系统位置…\n位置仅在本机处理，请稍候。";
                        }
                        if (request == null || request.Status == AsyncStatus.Started) return;
                        if (request.Status == AsyncStatus.Canceled) { fail("TIMEOUT"); return; }
                        if (request.Status == AsyncStatus.Error) throw request.ErrorCode;
                        var coordinate = request.GetResults().Coordinate;
                        var point = coordinate.Point.Position;
                        double lat = point.Latitude, lon = point.Longitude, accuracy = coordinate.Accuracy;
                        string source = coordinate.PositionSource.ToString();
                        if (Double.IsNaN(lat) || Double.IsNaN(lon) || Double.IsInfinity(lat) || Double.IsInfinity(lon) || Math.Abs(lat) > 90 || Math.Abs(lon) > 180 || Double.IsNaN(accuracy) || Double.IsInfinity(accuracy)) { fail("UNAVAILABLE"); return; }
                        if (source == "Default") { fail("DEFAULT_POSITION"); return; }
                        if (!allowApproximate && (source == "IPAddress" || accuracy > 5000)) { fail("LOW_ACCURACY"); return; }
                        if (DateTimeOffset.UtcNow - coordinate.Timestamp > TimeSpan.FromMinutes(2)) { fail("STALE_POSITION"); return; }
                        finish("{\"ok\":true,\"lat\":" + Math.Round(lat,2).ToString("0.00",CultureInfo.InvariantCulture) + ",\"lon\":" + Math.Round(lon,2).ToString("0.00",CultureInfo.InvariantCulture) + ",\"accuracy\":" + Math.Ceiling(accuracy).ToString(CultureInfo.InvariantCulture) + ",\"source\":\"" + source + "\",\"timestamp\":" + coordinate.Timestamp.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture) + "}");
                    } catch (UnauthorizedAccessException) { fail("DENIED"); }
                    catch { fail("UNAVAILABLE"); }
                };
                Application.Run(form);
            }
        } catch { if (!emitted) WriteError("UNAVAILABLE"); }
        return 0;
    }
    private static void WriteError(string code) { Console.WriteLine("{\"ok\":false,\"code\":\"" + code + "\"}"); }
}
