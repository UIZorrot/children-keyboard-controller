#include <napi.h>
#include <windows.h>

#include <atomic>
#include <cstring>
#include <thread>

namespace {
std::atomic<bool> running(false);
std::thread hookThread;
HHOOK keyboardHook = nullptr;
DWORD hookThreadId = 0;

bool IsPressed(int virtualKey) {
  return (GetAsyncKeyState(virtualKey) & 0x8000) != 0;
}

bool IsBlockedKey(DWORD vkCode) {
  const bool altDown = IsPressed(VK_MENU);
  const bool ctrlDown = IsPressed(VK_CONTROL);
  const bool shiftDown = IsPressed(VK_SHIFT);

  if (vkCode == VK_LWIN || vkCode == VK_RWIN) return true;
  if (altDown && (vkCode == VK_TAB || vkCode == VK_F4 || vkCode == VK_ESCAPE || vkCode == VK_SPACE)) return true;
  if (ctrlDown && (vkCode == VK_ESCAPE || vkCode == VK_TAB || vkCode == VK_SPACE)) return true;
  if (ctrlDown && shiftDown && vkCode == VK_ESCAPE) return true;
  if (ctrlDown && vkCode >= 0x41 && vkCode <= 0x5A) return true;
  if (vkCode >= VK_F1 && vkCode <= VK_F12) return true;

  return false;
}

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION) {
    KBDLLHOOKSTRUCT* info = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
    if (IsBlockedKey(info->vkCode)) {
      return 1;
    }
  }

  return CallNextHookEx(keyboardHook, nCode, wParam, lParam);
}

void HookLoop() {
  hookThreadId = GetCurrentThreadId();
  keyboardHook = SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc, GetModuleHandleW(nullptr), 0);

  MSG msg;
  while (running.load() && GetMessageW(&msg, nullptr, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }

  if (keyboardHook != nullptr) {
    UnhookWindowsHookEx(keyboardHook);
    keyboardHook = nullptr;
  }
}
}

Napi::Value StartBlocking(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (running.load()) return env.Undefined();

  running.store(true);
  hookThread = std::thread(HookLoop);
  return env.Undefined();
}

Napi::Value StopBlocking(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!running.load()) return env.Undefined();

  running.store(false);
  if (hookThreadId != 0) {
    PostThreadMessageW(hookThreadId, WM_QUIT, 0, 0);
  }
  if (hookThread.joinable()) {
    hookThread.join();
  }
  hookThreadId = 0;
  return env.Undefined();
}

Napi::Value ForceForegroundWindow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected a native window handle buffer").ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }

  Napi::Buffer<unsigned char> handleBuffer = info[0].As<Napi::Buffer<unsigned char>>();
  uintptr_t handleValue = 0;
  const size_t bytesToCopy = handleBuffer.Length() < sizeof(handleValue) ? handleBuffer.Length() : sizeof(handleValue);
  memcpy(&handleValue, handleBuffer.Data(), bytesToCopy);

  HWND hwnd = reinterpret_cast<HWND>(handleValue);
  if (hwnd == nullptr || !IsWindow(hwnd)) {
    return Napi::Boolean::New(env, false);
  }

  ShowWindow(hwnd, SW_RESTORE);
  SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);

  DWORD targetThreadId = GetWindowThreadProcessId(hwnd, nullptr);
  DWORD foregroundThreadId = GetWindowThreadProcessId(GetForegroundWindow(), nullptr);
  DWORD currentThreadId = GetCurrentThreadId();
  const bool attachForeground = foregroundThreadId != 0 && foregroundThreadId != currentThreadId;
  const bool attachTarget = targetThreadId != 0 && targetThreadId != currentThreadId;

  if (attachForeground) {
    AttachThreadInput(currentThreadId, foregroundThreadId, TRUE);
  }
  if (attachTarget) {
    AttachThreadInput(currentThreadId, targetThreadId, TRUE);
  }

  BringWindowToTop(hwnd);
  SetActiveWindow(hwnd);
  SetFocus(hwnd);
  const BOOL foregroundResult = SetForegroundWindow(hwnd);

  if (attachTarget) {
    AttachThreadInput(currentThreadId, targetThreadId, FALSE);
  }
  if (attachForeground) {
    AttachThreadInput(currentThreadId, foregroundThreadId, FALSE);
  }

  return Napi::Boolean::New(env, foregroundResult || GetForegroundWindow() == hwnd);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("startBlocking", Napi::Function::New(env, StartBlocking));
  exports.Set("stopBlocking", Napi::Function::New(env, StopBlocking));
  exports.Set("forceForegroundWindow", Napi::Function::New(env, ForceForegroundWindow));
  return exports;
}

NODE_API_MODULE(keyboard_blocker, Init)
