#include <napi.h>
#include <windows.h>

#include <atomic>
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

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("startBlocking", Napi::Function::New(env, StartBlocking));
  exports.Set("stopBlocking", Napi::Function::New(env, StopBlocking));
  return exports;
}

NODE_API_MODULE(keyboard_blocker, Init)
