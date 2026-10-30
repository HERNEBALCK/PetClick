$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$programPath = Join-Path $projectRoot 'release/win-unpacked/PetClick.exe'
$iconPath = Join-Path $projectRoot 'assets/app-icon.ico'
if (!(Test-Path -LiteralPath $programPath)) { throw "找不到程序：$programPath" }
if (!(Test-Path -LiteralPath $iconPath)) { throw "找不到图标：$iconPath" }

$shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Miku 桌宠.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $programPath
$shortcut.WorkingDirectory = Split-Path -Parent $programPath
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'Miku 桌宠 · 拍键盘、眨眼和点击计数'
$shortcut.Save()

$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $programPath -or $verified.IconLocation -ne "$iconPath,0") {
    throw '快捷方式校验失败'
}
Write-Output "已创建并校验：$shortcutPath"
