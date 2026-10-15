Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(256,256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(0x1e,0x1e,0x2e))
$font = New-Object System.Drawing.Font('Segoe UI', 100, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString('VT', $font, $brush, 0, 0, $sf)
$bmp.Save('C:\Users\spenc\vtubercc\src-tauri\icons\icon.ico', [System.Drawing.Imaging.ImageFormat]::Icon)
$g.Dispose()
$bmp.Dispose()
Write-Host 'Icon created successfully'