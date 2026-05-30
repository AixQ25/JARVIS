Add-Type @"
using System;
using System.Runtime.InteropServices;
public class InputDetector {
  [DllImport("user32.dll")]
  public static extern short GetAsyncKeyState(int vKey);
  
  public static bool IsKeyboardActive() {
    // 检查特殊键 (Backspace, Tab, Enter, CapsLock, Space, Delete)
    int[] specialKeys = new int[] { 0x08, 0x09, 0x0D, 0x14, 0x20, 0x2E };
    
    foreach (int key in specialKeys) {
      if ((GetAsyncKeyState(key) & 0x8000) != 0) {
        return true;
      }
    }
    
    // 检查A-Z
    for (int i = 0x41; i <= 0x5A; i++) {
      if ((GetAsyncKeyState(i) & 0x8000) != 0) {
        return true;
      }
    }
    
    // 检查0-9
    for (int i = 0x30; i <= 0x39; i++) {
      if ((GetAsyncKeyState(i) & 0x8000) != 0) {
        return true;
      }
    }
    
    return false;
  }
}
"@

$isKeyboardActive = [InputDetector]::IsKeyboardActive()
if ($isKeyboardActive) {
  Write-Output 0
} else {
  Write-Output 99999
}
