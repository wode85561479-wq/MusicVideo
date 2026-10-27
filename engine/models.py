"""Local CPU inference helpers: Depth Anything V2 (depth), ISNet (matting), Real-ESRGAN (upscale).

All models run through onnxruntime on CPU. Real-ESRGAN weights ship as a PyTorch .pth;
PyTorch is not installable here, so the .pth is parsed directly and the
SRVGGNetCompact graph is rebuilt as ONNX.
"""
import pickle
import zipfile
from pathlib import Path

import numpy as np
import cv2
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
_sessions = {}


def _session(name):
    if name not in _sessions:
        so = ort.SessionOptions()
        so.intra_op_num_threads = 4
        _sessions[name] = ort.InferenceSession(str(MODELS / name), so, providers=["CPUExecutionProvider"])
    return _sessions[name]


# ---------------------------------------------------------------- depth
def depth(img_rgb_u8):
    """Relative disparity in [0,1] (1 = nearest), same size as input."""
    h, w = img_rgb_u8.shape[:2]
    x = cv2.resize(img_rgb_u8, (518, 518), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = x.transpose(2, 0, 1)[None]
    d = _session("depth_anything_v2_vits.onnx").run(None, {"l_x_": x})[0][0]
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
    return np.clip((d - lo) / (hi - lo + 1e-9), 0, 1).astype(np.float32)


# ---------------------------------------------------------------- matting
def matte_isnet(img_rgb_u8):
    h, w = img_rgb_u8.shape[:2]
    x = cv2.resize(img_rgb_u8, (1024, 1024), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / 1.0
    x = x.transpose(2, 0, 1)[None]
    m = _session("isnet-anime.onnx").run(None, {"img": x})[0][0, 0]
    m = (m - m.min()) / (m.max() - m.min() + 1e-9)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR).astype(np.float32)


def matte_u2net(img_rgb_u8):
    h, w = img_rgb_u8.shape[:2]
    x = cv2.resize(img_rgb_u8, (320, 320), interpolation=cv2.INTER_LANCZOS4).astype(np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = x.transpose(2, 0, 1)[None]
    m = _session("u2net.onnx").run(None, {"input.1": x})[0][0, 0]
    m = (m - m.min()) / (m.max() - m.min() + 1e-9)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR).astype(np.float32)


# ---------------------------------------------------------------- Real-ESRGAN (SRVGGNetCompact)
class _Storage:
    def __init__(self, key, dtype):
        self.key, self.dtype = key, dtype


def _load_pth(path):
    z = zipfile.ZipFile(path)
    prefix = z.namelist()[0].split("/")[0]
    dtypes = {"FloatStorage": np.float32, "HalfStorage": np.float16, "LongStorage": np.int64}

    class U(pickle.Unpickler):
        def find_class(self, mod, name):
            if name in dtypes:
                return name
            if name == "_rebuild_tensor_v2":
                def rebuild(storage, offset, size, stride, *a):
                    buf = np.frombuffer(z.read(f"{prefix}/data/{storage.key}"), dtype=storage.dtype)
                    n = int(np.prod(size)) if len(size) else 1
                    return np.lib.stride_tricks.as_strided(buf[offset:], shape=size,
                                                           strides=[s * buf.itemsize for s in stride]).copy() if n else buf[:0]
                return rebuild
            if name == "OrderedDict":
                import collections
                return collections.OrderedDict
            return super().find_class(mod, name)

        def persistent_load(self, pid):
            _, typ, key, _loc, _n = pid
            return _Storage(key, dtypes[typ])

    return U(z.open(f"{prefix}/data.pkl")).load()


def _build_esrgan_onnx(pth, out_path, scale=4):
    import onnx
    from onnx import helper, numpy_helper, TensorProto
    sd = _load_pth(pth)
    sd = sd.get("params", sd)
    keys = sorted({int(k.split(".")[1]) for k in sd}, key=int)
    nodes, inits = [], []
    cur = "x"
    for i in keys:
        w = sd[f"body.{i}.weight"]
        if w.ndim == 4:
            inits += [numpy_helper.from_array(w.astype(np.float32), f"w{i}"),
                      numpy_helper.from_array(sd[f"body.{i}.bias"].astype(np.float32), f"b{i}")]
            nodes.append(helper.make_node("Conv", [cur, f"w{i}", f"b{i}"], [f"c{i}"], pads=[1, 1, 1, 1]))
            cur = f"c{i}"
        else:  # PReLU slope
            inits.append(numpy_helper.from_array(w.astype(np.float32).reshape(-1, 1, 1), f"p{i}"))
            nodes.append(helper.make_node("PRelu", [cur, f"p{i}"], [f"a{i}"]))
            cur = f"a{i}"
    nodes.append(helper.make_node("DepthToSpace", [cur], ["up"], blocksize=scale, mode="CRD"))
    inits.append(numpy_helper.from_array(np.array([1, 1, scale, scale], np.float32), "scales"))
    nodes.append(helper.make_node("Resize", ["x", "", "scales"], ["base"], mode="nearest"))
    nodes.append(helper.make_node("Add", ["up", "base"], ["y"]))
    g = helper.make_graph(nodes, "srvgg",
                          [helper.make_tensor_value_info("x", TensorProto.FLOAT, [1, 3, None, None])],
                          [helper.make_tensor_value_info("y", TensorProto.FLOAT, [1, 3, None, None])], inits)
    m = helper.make_model(g, opset_imports=[helper.make_opsetid("", 13)])
    m.ir_version = 8
    onnx.save(m, out_path)


def upscale(img_rgb_u8, target_w=None, tile=384, pad=16):
    """Real-ESRGAN x4 (anime video v3), tiled; optional Lanczos resize to target width."""
    onnx_path = MODELS / "realesr-animevideov3.onnx"
    if not onnx_path.exists():
        _build_esrgan_onnx(MODELS / "realesr-animevideov3.pth", str(onnx_path))
    sess = _session(onnx_path.name)
    x = img_rgb_u8.astype(np.float32) / 255.0
    h, w = x.shape[:2]
    out = np.zeros((h * 4, w * 4, 3), np.float32)
    for y0 in range(0, h, tile):
        for x0 in range(0, w, tile):
            ya, yb = max(0, y0 - pad), min(h, y0 + tile + pad)
            xa, xb = max(0, x0 - pad), min(w, x0 + tile + pad)
            t = x[ya:yb, xa:xb].transpose(2, 0, 1)[None]
            r = sess.run(None, {"x": np.ascontiguousarray(t)})[0][0].transpose(1, 2, 0)
            oy, ox = (y0 - ya) * 4, (x0 - xa) * 4
            th, tw = min(tile, h - y0) * 4, min(tile, w - x0) * 4
            out[y0 * 4:y0 * 4 + th, x0 * 4:x0 * 4 + tw] = r[oy:oy + th, ox:ox + tw]
    out = (np.clip(out, 0, 1) * 255).round().astype(np.uint8)
    if target_w:
        th = int(round(out.shape[0] * target_w / out.shape[1]))
        out = cv2.resize(out, (target_w, th), interpolation=cv2.INTER_AREA)
    return out
