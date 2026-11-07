# 文件名: web_server.py
# 用途: 启动本地网页，并通过 HTTP API 调用真实战斗引擎
"""三国武将马战可视化网页的零依赖本地服务。"""

import argparse
import json
import random
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

from main import DEFAULT_WARRIORS, STAT_FIELDS
from src import BattleEngine, Warrior
from src.battle_events import build_battle_replay

PROJECT_ROOT = Path(__file__).resolve().parent
WEB_ROOT = PROJECT_ROOT / "web"
SIMULATION_LOCK = Lock()


def _parse_warrior(raw: dict, side: str) -> Warrior:
    defaults = DEFAULT_WARRIORS[side]
    source = raw if isinstance(raw, dict) else {}
    name = str(source.get("name", defaults["name"])).strip()
    if not name or len(name) > 12:
        raise ValueError(f"{side.upper()} 方姓名须为 1～12 个字符")

    stats = {}
    for field in STAT_FIELDS:
        value = source.get(field, defaults[field])
        if isinstance(value, bool):
            raise ValueError(f"{name} 的 {field} 必须是整数")
        try:
            value = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} 的 {field} 必须是整数") from exc
        maximum = 200 if field == "sp" else 120
        if not 1 <= value <= maximum:
            raise ValueError(f"{name} 的 {field} 须在 1～{maximum} 之间")
        stats[field] = value

    return Warrior(name, side.upper(), **stats)


def simulate(payload: dict) -> dict:
    """同步完成模拟，返回不含任何前端重算结果的完整战报。"""
    warriors = payload.get("warriors", {})
    if not isinstance(warriors, dict):
        raise ValueError("warriors 格式不正确")
    warrior_a = _parse_warrior(warriors.get("a", {}), "a")
    warrior_b = _parse_warrior(warriors.get("b", {}), "b")

    seed = payload.get("seed")
    if seed is None:
        seed = random.SystemRandom().randint(1, 2_147_483_647)
    if isinstance(seed, bool):
        raise ValueError("随机种子必须是整数")
    try:
        seed = int(seed)
    except (TypeError, ValueError) as exc:
        raise ValueError("随机种子必须是整数") from exc

    snapshots_a = [warrior_a.snapshot()]
    snapshots_b = [warrior_b.snapshot()]
    # 战斗引擎使用全局 random；加锁避免并发请求互相污染随机序列。
    with SIMULATION_LOCK:
        random.seed(seed)
        result = BattleEngine([warrior_a], [warrior_b]).run()
    return build_battle_replay(result, snapshots_a, snapshots_b, seed=seed)


class BattleWebHandler(SimpleHTTPRequestHandler):
    """提供静态网页与单场战斗 API。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def _send_json(self, data: dict, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/api/health":
            self._send_json({"ok": True})
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/battle":
            self._send_json({"error": "接口不存在"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 32_768:
                raise ValueError("请求内容为空或过大")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("请求内容必须是 JSON 对象")
            self._send_json(simulate(payload))
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
            self._send_json({"error": str(exc)}, 400)
        except Exception:
            self._send_json({"error": "战斗模拟失败，请查看服务终端"}, 500)
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description="三国武将马战可视化网页")
    parser.add_argument("--port", type=int, default=8000, help="本地端口（默认 8000）")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), BattleWebHandler)
    host, port = server.server_address
    print(f"三国马战网页已启动: http://{host}:{port}")
    print("按 Ctrl+C 停止服务")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
