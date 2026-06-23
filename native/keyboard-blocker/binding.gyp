{
  "targets": [
    {
      "target_name": "keyboard_blocker",
      "sources": ["keyboard_blocker.cc"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "libraries": ["user32.lib"]
        }]
      ]
    }
  ]
}
