Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct LASTINPUTINFO {
  public uint cbSize;
  public uint dwTime;
}
public class User32 {
  [DllImport("user32.dll")]
  public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
}
"@

$lii = New-Object LASTINPUTINFO
$lii.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($lii)
[User32]::GetLastInputInfo([ref]$lii) | Out-Null
$lastInput = $lii.dwTime
$tickCount = [Environment]::TickCount
$idleTime = $tickCount - $lastInput
Write-Output $idleTime
