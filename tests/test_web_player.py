# 文件名: tests/test_web_player.py
# 用途: 用轻量 DOM 桩验证网页播放器对 A/B 队伍键的大小写归一化

import json
import shutil
import subprocess
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_JS = PROJECT_ROOT / "web" / "app.js"

NODE_HARNESS = r"""
const fs = require('fs');
const vm = require('vm');
const appPath = process.argv[1];
const selectors = [];
function element() {
  return {
    textContent: '', innerHTML: '', hidden: false, disabled: false, value: '',
    scrollTop: 0, scrollHeight: 0, offsetLeft: 0, offsetWidth: 100, offsetHeight: 100,
    dataset: {}, style: { width: '', setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, replaceChildren() {}, append() {}, remove() {}, click() {},
    close() {}, showModal() {}, querySelector() { return element(); },
  };
}
const document = {
  querySelector(selector) { selectors.push(selector); return element(); },
  querySelectorAll() { return []; },
  createElement() { return element(); },
  documentElement: { style: { setProperty() {} } },
  body: { classList: { add() {}, remove() {} } },
};
const window = {
  location: { search: '' },
  setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
  addEventListener() {},
};
const context = vm.createContext({
  document, window, console, selectors, URLSearchParams, Math, JSON,
  fetch: () => Promise.reject(new Error('skip')),
});
vm.runInContext(fs.readFileSync(appPath, 'utf8'), context);
vm.runInContext(`
  player.battle = {
    initial_states: {
      A: { hp: 9800, max_hp: 9800, sp: 4900, max_sp: 4900, courage: 94, alive: true },
      B: { hp: 10000, max_hp: 10000, sp: 5000, max_sp: 5000, courage: 96, alive: true },
    },
    events: [], result: { rounds: 0, ticks: 0, states: {} }, warriors: [],
  };
  resetPlayback();
  selectors.length = 0;
  updatePanel('A', { hp: 9700, sp: 4800, courage: 90, alive: true });
  updatePanel('B', { hp: 9900, sp: 4900, courage: 99, alive: true });
  console.log(JSON.stringify({ selectors, states: player.states }));
`, context);
"""


class WebPlayerStateTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "需要 Node.js 才能运行前端 DOM 桩测试")
    def test_uppercase_event_side_updates_lowercase_dom_ids(self):
        result = subprocess.run(
            ["node", "-e", NODE_HARNESS, str(APP_JS)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        output = json.loads(result.stdout.strip().splitlines()[-1])
        selectors = output["selectors"]
        self.assertIn("#hp-a", selectors)
        self.assertIn("#hp-b", selectors)
        self.assertNotIn("#hp-A", selectors)
        self.assertNotIn("#hp-B", selectors)
        self.assertAlmostEqual(output["states"]["a"]["hp"], 9700)
        self.assertAlmostEqual(output["states"]["b"]["hp"], 9900)


if __name__ == "__main__":
    unittest.main()
