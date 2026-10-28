#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
server.py
作品集网站本地全功能预览与自动持久化服务器
特性：
- 静态文件极速托管 (HTML / CSS / JS / 视频 / 图片)
  支持 HTTP 范围请求 (Range: bytes=start-end / start- / -suffix，返回 206 / 416)，
  视频可在 Safari 中播放并随意拖动进度条；不支持多段 Range（此时回退为完整 200 响应）
- 多线程服务 (ThreadingHTTPServer)，大视频下载不会阻塞其它请求
- API: POST /api/save-projects
  直接将网页端编辑的数据写入本地 js/projects.js 文件 (加锁 + 原子替换)
  自动将上传的海报与图标 Base64 存储为本地真实图片文件 (assets/thumbnails/...)
- API: POST /api/upload-video?name=<文件名>
  请求体为视频文件原始字节，保存到 assets/videos/ 并返回相对路径
安全：
- 服务监听所有网卡，局域网内的设备（如手机）可以只读浏览网站 (GET / HEAD)
- 写入类 API (POST) 仅接受来自本机的同源请求：
  客户端地址必须是回环地址，Host / Origin 必须是 localhost / 127.0.0.1 / ::1 / 0.0.0.0
  且 Origin 端口与本服务一致，Sec-Fetch-Site 只能是 same-origin / none；
  其余请求一律返回 403 (防止局域网写入、跨站请求伪造 CSRF 与 DNS 重绑定)
用法：python3 server.py [端口]   (默认 8000)
"""

import base64
import http.server
import ipaddress
import json
import os
import re
import stat
import sys
import tempfile
import threading
import urllib.parse

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
ALLOWED_VIDEO_EXTS = {'.mp4', '.webm'}
ALLOWED_IMAGE_EXTS = {'jpg', 'png', 'webp', 'gif'}
UPLOAD_CHUNK_SIZE = 1024 * 1024
RANGE_CHUNK_SIZE = 64 * 1024
MAX_STEM_BYTES = 150                        # 上传文件名主体的 UTF-8 字节上限 (再加序号 / 扩展名 / .tmp 仍远小于 255)
MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024    # 单个视频上传上限 2 GiB
MAX_JSON_BODY = 256 * 1024 * 1024           # 保存作品数据的请求体上限 (含 Base64 图片)
LOCAL_HOSTNAMES = {'localhost', '127.0.0.1', '::1', '0.0.0.0'}
CONNECTION_ERRORS = (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)

# 并发控制：保存 projects.js / 预留上传文件名都需要串行
SAVE_LOCK = threading.Lock()
UPLOAD_NAME_LOCK = threading.Lock()


def reserve_video_file(target_dir, raw_name):
    """清洗上传文件名 (去掉目录部分与特殊字符)，重名时追加序号，避免覆盖已有视频
    在锁内以独占方式 (xb) 创建 "<最终文件名>.tmp"；调用方必须在同一把 UPLOAD_NAME_LOCK 内
    完成 os.replace(tmp, final)，否则 "检查 final 不存在 -> 创建 tmp" 会与改名交错，导致同名覆盖
    清洗后的文件名主体按 UTF-8 字节数截断 (MAX_STEM_BYTES)，避免超出文件系统 255 字节的限制
    返回 (最终文件名, 已打开的临时文件对象)；扩展名不被允许则返回 None"""
    name = os.path.basename(raw_name.replace('\\', '/'))
    stem, ext = os.path.splitext(name)
    ext = ext.lower()
    if ext not in ALLOWED_VIDEO_EXTS:
        return None
    stem = re.sub(r'[^\w\-]+', '_', stem).strip('_')
    # 按字节截断并丢弃末尾被切断的半个字符
    stem = stem.encode('utf-8')[:MAX_STEM_BYTES].decode('utf-8', 'ignore').strip('_') or 'video'
    with UPLOAD_NAME_LOCK:
        candidate = f"{stem}{ext}"
        n = 1
        while True:
            final_path = os.path.join(target_dir, candidate)
            if not os.path.exists(final_path):
                try:
                    return candidate, open(final_path + '.tmp', 'xb')
                except FileExistsError:
                    pass  # 其它上传正占用该名字，换下一个序号
            candidate = f"{stem}-{n}{ext}"
            n += 1


def save_base64_image(data_uri, target_dir, filename_prefix):
    """解码 base64 图片并保存为本地文件，返回文件名 (仅允许 jpg / png / webp / gif)"""
    try:
        match = re.match(r'^data:image/([a-zA-Z0-9\+\-]+);base64,(.+)$', data_uri)
        if not match:
            return None
        ext = match.group(1).lower()
        if ext == 'jpeg':
            ext = 'jpg'
        if ext not in ALLOWED_IMAGE_EXTS:
            return None
        b64_data = match.group(2)
        img_bytes = base64.b64decode(b64_data)

        os.makedirs(target_dir, exist_ok=True)
        filename = f"{filename_prefix}.{ext}"
        filepath = os.path.join(target_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(img_bytes)
        return filename
    except Exception as e:
        print(f"[Error saving image] {e}")
        return None


def safe_project_id(raw_id, idx):
    """作品 id 来自客户端，只保留 [A-Za-z0-9_-]，防止路径穿越；为空则回退 proj_N"""
    safe = re.sub(r'[^A-Za-z0-9_-]+', '_', str(raw_id or '')).strip('_')[:64]
    return safe or f"proj_{idx + 1}"


def write_file_atomic(path, content):
    """先写同目录临时文件再 os.replace，任何时刻 path 都是完整文件"""
    try:
        mode = stat.S_IMODE(os.stat(path).st_mode)
    except OSError:
        mode = 0o644
    fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(path), prefix='.projects.', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp_path, mode)
        os.replace(tmp_path, path)
    except BaseException:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


class PortfolioServer(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # 视频元素会频繁中断请求，连接类错误不打印堆栈
        if isinstance(sys.exc_info()[1], CONNECTION_ERRORS):
            return
        super().handle_error(request, client_address)


class PortfolioHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    # ---------- 通用响应 ----------

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_response(self, code, message=None):
        self._last_status = code
        super().send_response(code, message)

    def end_headers(self):
        # 静态文件的 200 / 206 / 416 响应都声明支持范围请求
        if (getattr(self, 'command', None) in ('GET', 'HEAD')
                and getattr(self, '_last_status', None) in (200, 206, 416)):
            self.send_header('Accept-Ranges', 'bytes')
        # 页面 / 脚本 / 样式每次都向服务器验证 (仍可凭 Last-Modified 得到 304)，避免浏览器启发式缓存旧数据
        if (getattr(self, 'command', None) in ('GET', 'HEAD')
                and getattr(self, '_last_status', None) in (200, 206, 304)):
            url_path = urllib.parse.urlsplit(getattr(self, 'path', '')).path.lower()
            if url_path == '/' or url_path.endswith(('.html', '.js', '.css')):
                self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    # ---------- 静态文件 (含 Range) ----------

    def parse_range(self, size):
        """解析 Range 头。返回 None=忽略 Range 走完整响应；'unsatisfiable'=416；(start, end)=有效区间"""
        header = self.headers.get('Range')
        if not header:
            return None
        match = re.match(r'^\s*bytes\s*=\s*(.*?)\s*$', header, re.IGNORECASE)
        if not match or ',' in match.group(1):
            return None
        spec = re.match(r'^(\d{0,18})-(\d{0,18})$', match.group(1))
        if not spec or (not spec.group(1) and not spec.group(2)):
            return None
        first, last = spec.group(1), spec.group(2)
        if not first:
            # 后缀区间: 最后 N 个字节
            suffix = int(last)
            if suffix == 0 or size == 0:
                return 'unsatisfiable'
            return max(0, size - suffix), size - 1
        start = int(first)
        end = int(last) if last else size - 1
        if last and end < start:
            return None  # 语法无效，按规范忽略
        if start >= size:
            return 'unsatisfiable'
        return start, min(end, size - 1)

    def serve_range(self, send_body):
        """处理带 Range 头的静态文件请求；不属于范围请求时返回 False，交给父类处理"""
        if not self.headers.get('Range'):
            return False
        url_path = urllib.parse.urlsplit(self.path).path
        if url_path.endswith('/'):
            return False
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return False
        try:
            f = open(path, 'rb')
        except OSError:
            return False
        with f:
            fs = os.fstat(f.fileno())
            size = fs.st_size
            last_modified = self.date_time_string(fs.st_mtime)
            if_range = self.headers.get('If-Range')
            if if_range and if_range.strip() != last_modified:
                return False  # 资源已变化，返回完整内容
            result = self.parse_range(size)
            if result is None:
                return False
            if result == 'unsatisfiable':
                self.send_response(416)
                self.send_header('Content-Range', f"bytes */{size}")
                self.send_header('Content-Length', '0')
                self.end_headers()
                return True
            start, end = result
            length = end - start + 1
            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Range', f"bytes {start}-{end}/{size}")
            self.send_header('Content-Length', str(length))
            self.send_header('Last-Modified', last_modified)
            self.end_headers()
            if send_body:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(RANGE_CHUNK_SIZE, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        return True

    def do_GET(self):
        try:
            if not self.serve_range(True):
                super().do_GET()
        except CONNECTION_ERRORS:
            self.close_connection = True

    def do_HEAD(self):
        try:
            if not self.serve_range(False):
                super().do_HEAD()
        except CONNECTION_ERRORS:
            self.close_connection = True

    # ---------- 写入 API 的访问控制 ----------

    def check_local_request(self):
        """写入 API 仅允许本机同源请求；通过返回 None，否则返回中文错误信息"""
        try:
            addr = ipaddress.ip_address(self.client_address[0].split('%')[0])
            if addr.version == 6 and addr.ipv4_mapped:
                addr = addr.ipv4_mapped
            is_loopback = addr.is_loopback
        except ValueError:
            is_loopback = False
        if not is_loopback:
            return "写入接口仅允许本机访问"

        try:
            host = urllib.parse.urlsplit('//' + (self.headers.get('Host') or '')).hostname
        except ValueError:
            host = None
        if host not in LOCAL_HOSTNAMES:
            return "非法的 Host 请求头"

        origin = self.headers.get('Origin')
        if origin is not None:
            try:
                o = urllib.parse.urlsplit(origin)
                origin_ok = (o.scheme == 'http' and o.hostname in LOCAL_HOSTNAMES
                             and (o.port or 80) == self.server.server_address[1])
            except ValueError:
                origin_ok = False
            if not origin_ok:
                return "禁止跨站请求 (Origin 不匹配)"

        fetch_site = self.headers.get('Sec-Fetch-Site')
        if fetch_site is not None and fetch_site not in ('same-origin', 'none'):
            return "禁止跨站请求 (Sec-Fetch-Site)"
        return None

    def read_content_length(self, limit):
        """解析 Content-Length；非法返回 None (已回复 400)，超限返回 None (已回复 413)"""
        raw = (self.headers.get('Content-Length') or '0').strip()
        if not re.fullmatch(r'\d{1,18}', raw):
            self.send_json(400, {"success": False, "error": "Content-Length 无效"})
            return None
        length = int(raw)
        if length > limit:
            self.close_connection = True
            self.send_json(413, {"success": False,
                                 "error": f"请求内容过大 (上限 {limit // 1024 // 1024} MiB)"})
            return None
        return length

    # ---------- 写入 API ----------

    def handle_upload_video(self, query):
        """将请求体中的视频分块写入 assets/videos/，先写临时文件，完整后再改名"""
        raw_name = urllib.parse.parse_qs(query).get('name', [''])[0]
        content_length = self.read_content_length(MAX_UPLOAD_SIZE)
        if content_length is None:
            return
        if content_length <= 0:
            self.send_json(400, {"success": False, "error": "上传内容为空"})
            return

        videos_dir = os.path.join(DIRECTORY, 'assets', 'videos')
        try:
            os.makedirs(videos_dir, exist_ok=True)
            reserved = reserve_video_file(videos_dir, raw_name)
        except OSError as e:
            self.close_connection = True  # 请求体尚未读取
            print(f"[API Error] 无法创建上传文件: {e}")
            self.send_json(500, {"success": False, "error": f"无法创建上传文件: {e.strerror or e}"})
            return
        if not reserved:
            self.send_json(400, {"success": False, "error": "仅支持 MP4 / WebM 视频文件"})
            return

        filename, f = reserved
        final_path = os.path.join(videos_dir, filename)
        tmp_path = final_path + '.tmp'
        try:
            with f:
                remaining = content_length
                while remaining > 0:
                    chunk = self.rfile.read(min(UPLOAD_CHUNK_SIZE, remaining))
                    if not chunk:
                        raise ConnectionError('上传连接中断')
                    f.write(chunk)
                    remaining -= len(chunk)
            with UPLOAD_NAME_LOCK:  # 与 reserve_video_file 的 "检查 + 创建" 互斥
                os.replace(tmp_path, final_path)
        except Exception as e:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            print(f"[API Error] 视频上传失败: {e}")
            self.send_json(500, {"success": False, "error": str(e)})
            return

        src = f"assets/videos/{filename}"
        self.send_json(200, {"success": True, "src": src, "size": content_length})
        print(f"[API] 已保存上传视频 {src} ({content_length / 1024 / 1024:.1f} MiB)")

    def handle_save_projects(self):
        content_length = self.read_content_length(MAX_JSON_BODY)
        if content_length is None:
            return
        try:
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
        except (UnicodeDecodeError, ValueError):
            self.send_json(400, {"success": False, "error": "请求体不是有效的 JSON"})
            return

        projects = data.get('projects') if isinstance(data, dict) else data
        if not isinstance(projects, list) or not all(isinstance(p, dict) for p in projects):
            self.send_json(400, {"success": False, "error": "作品数据必须是对象数组"})
            return

        try:
            with SAVE_LOCK:
                thumbs_dir = os.path.join(DIRECTORY, 'assets', 'thumbnails')

                # 处理其中的 Base64 图片，落地为本地图片文件
                for idx, proj in enumerate(projects):
                    proj_id = safe_project_id(proj.get('id'), idx)
                    orig_thumb = proj.get('thumbnail', '')
                    orig_icon = proj.get('icon', '')

                    # 海报处理
                    if isinstance(orig_thumb, str) and orig_thumb.startswith('data:image/'):
                        saved = save_base64_image(orig_thumb, thumbs_dir, f"{proj_id}_thumb")
                        if saved:
                            proj['thumbnail'] = f"assets/thumbnails/{saved}"

                    # 图标处理
                    if isinstance(orig_icon, str) and orig_icon.startswith('data:image/'):
                        if orig_icon == orig_thumb:
                            proj['icon'] = proj['thumbnail']
                        else:
                            saved_icon = save_base64_image(orig_icon, thumbs_dir, f"{proj_id}_icon")
                            if saved_icon:
                                proj['icon'] = f"assets/thumbnails/{saved_icon}"

                # 原子写入本地 js/projects.js 文件
                projects_js_path = os.path.join(DIRECTORY, 'js', 'projects.js')

                js_content = f"""/**
 * 作品集数据配置文件 (projects.js)
 * 葛文轩 (Wenxuan Ge) - 游戏系统策划 / 关卡设计
 * (本文件由网页端编辑后自动持久化更新)
 */

const DEFAULT_PROJECTS = {json.dumps(projects, ensure_ascii=False, indent=2)};

window.PORTFOLIO_DATA = {{
  author: {{
    name: "葛文轩",
    pinyin: "WENXUAN GE",
    title: "游戏系统策划 / 关卡设计",
    bio: "专注于力学拟真、无缝心流与物理交互设计。",
    email: "wge66689@gmail.com",
    itch: "https://kineticplanet.itch.io",
    resumeUrl: ""
  }},
  projects: DEFAULT_PROJECTS
}};
"""
                write_file_atomic(projects_js_path, js_content)

            self.send_json(200, {
                "success": True,
                "message": "已成功写入本地 js/projects.js 文件！",
                "updatedProjects": projects
            })
            print(f"[API] 成功保存 {len(projects)} 个作品到 js/projects.js")
        except CONNECTION_ERRORS:
            raise
        except Exception as e:
            print(f"[API Error] 保存失败: {e}")
            self.send_json(500, {"success": False, "error": str(e)})

    def do_POST(self):
        try:
            error = self.check_local_request()
            if error:
                self.close_connection = True
                self.send_json(403, {"success": False, "error": error})
                return

            parsed = urllib.parse.urlsplit(self.path)
            if parsed.path == '/api/upload-video':
                self.handle_upload_video(parsed.query)
            elif parsed.path == '/api/save-projects':
                self.handle_save_projects()
            else:
                self.send_json(404, {"success": False, "error": "接口不存在"})
        except CONNECTION_ERRORS:
            self.close_connection = True


if __name__ == '__main__':
    # 支持命令行指定端口，默认 8000
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        PORT = int(sys.argv[1])
    server_address = ('', PORT)
    httpd = PortfolioServer(server_address, PortfolioHTTPRequestHandler)
    print(f"========================================================")
    print(f" 🚀 作品集全功能本地服务器运行中: http://localhost:{PORT}")
    print(f" 💾 支持点「保存」直接同步写入本地 js/projects.js 文件")
    print(f" 🔒 局域网设备仅可只读浏览，保存/上传仅限本机访问")
    print(f"========================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止。")
