"""
End-to-end test of narrative analysis in the real MARTi GUI: GUI server (Node) + marti_llm.narrate (Python) +
a mock OpenAI-compatible LLM + a headless browser.

    python tests/gui_e2e_test.py /path/to/MARTi [screenshot_dir]

Needs Node.js with the GUI's dependencies installed (npm install in gui/UI) and Python Playwright with Chromium.
Uses a temporary copy of MARTi's example data and a temporary home folder for the settings file.
"""
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MARTI = Path(sys.argv[1] if len(sys.argv) > 1 else "../MARTi").resolve()
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
GUI = MARTI / "gui" / "UI"
tmp = Path(tempfile.mkdtemp())
data = tmp / "output"
shutil.copytree(MARTI / "gui" / "output", data)
home = tmp / "home"
home.mkdir()
P8 = data / "BAMBI_P8_1D_19092017" / "marti" / "BAMBI_P8_1D_19092017"
P103 = next((data / "BAMBI_P103M_400ng_RAD4_20122017" / "marti").iterdir())
KEY = "sk-e2e-SECRET-0123456789wxyz"
failures = 0


def check(label, ok, detail=""):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + label + (f"  [{detail}]" if detail and not ok else ""), flush=True)


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# ---------------------------------------------------------------- mock LLM (OpenAI-compatible)
ANSWER = {
    "summary": "Klebsiella pneumoniae dominates this sample, with 16,774 reads (65.6% of classified reads), "
               "followed by Proteus mirabilis with 2,936 reads.",
    "sections": [
        {"title": "Overview", "text": "The run is complete: 25,705 reads were analysed and sequencing appears "
                                      "saturated at species level."},
        {"title": "Organisms of note", "text": "Escherichia coli (19 reads) and Salmonella enterica (2 reads) "
                                               "are presumptive at these counts. Listeria monocytogenes was not "
                                               "detected. <img src=x onerror=\"window.__xss=1\">"},
        {"title": "Antimicrobial resistance", "text": "SHV-187 was attributed to Klebsiella pneumoniae; SHV "
                                                      "variants are often chromosomal in this species."},
        {"title": "Data quality and limitations", "text": "Taxonomic detection does not establish viability."}]}
LLM_REQUESTS = []


class MockLLM(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send({"data": [{"id": "mock-model"}]})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["content-length"])))
        LLM_REQUESTS.append({"auth": self.headers.get("authorization"), "body": body})
        time.sleep(2)   # long enough for the browser to show progress
        self._send({"choices": [{"message": {"role": "assistant", "content": json.dumps(ANSWER)}}],
                    "usage": {"prompt_tokens": 2100, "completion_tokens": 350}})


llm = HTTPServer(("127.0.0.1", 0), MockLLM)
threading.Thread(target=llm.serve_forever, daemon=True).start()
LLM_URL = f"http://127.0.0.1:{llm.server_port}/v1"


# ---------------------------------------------------------------- GUI servers
def start_gui(port, *extra):
    env = {**os.environ, "HOME": str(home)}
    env.pop("MARTI_LLM_API_KEY", None)
    log = open(tmp / f"gui_{port}.log", "w")
    p = subprocess.Popen(["node", "index.js", "--marti", str(data), "-p", str(port), "--llm-tools", str(ROOT),
                          "--llm-python", sys.executable, *extra], cwd=GUI, env=env, stdout=log,
                         stderr=subprocess.STDOUT)
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.2).close()
            break
        except OSError:
            time.sleep(0.2)
    time.sleep(8)   # let the watcher load the samples
    return p


def uuid_of(sample_dir):
    return json.loads((sample_dir / "sample.json").read_text())["sample"]["uuid"]


def shot(page, name, **kw):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / f"{name}.png"), **kw)


port = free_port()
gui = start_gui(port)
base = f"http://127.0.0.1:{port}"
frames = []      # every socket.io frame the browsers receive

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1400, "height": 1000}, device_scale_factor=2)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("websocket", lambda ws: ws.on("framereceived", lambda f: frames.append(str(f))))
        page.goto(f"{base}/sample/{uuid_of(P8)}")
        page.wait_for_selector("#narrativeCard")
        page.wait_for_function("document.querySelector('#narrativeEmpty').innerText.includes('Options')")
        check("before setup: card explains how to set up a model, Generate button disabled",
              page.is_disabled("#narrativeGenerateButton")
              and "choose an AI model in Options" in page.inner_text("#narrativeEmpty"))
        shot(page, "1_card_not_configured", clip={"x": 104, "y": 480, "width": 1296, "height": 200})

        # ---- settings in Options
        page.click("a[data-target='#optionsModal']")
        page.wait_for_selector("#llmSettingsSection", state="visible")
        page.select_option("#llmProvider", "openai-compatible")
        check("server URL field appears for a local server", page.is_visible("#llmBaseUrl"))
        page.fill("#llmBaseUrl", "javascript:alert(1)")
        page.fill("#llmModel", "mock-model")
        page.click("#llmSaveButton")
        page.wait_for_function("document.querySelector('#llmSettingsStatus').innerText.length > 8")
        check("invalid server URL is refused by the server", "http" in page.inner_text("#llmSettingsStatus"),
              page.inner_text("#llmSettingsStatus"))
        page.fill("#llmBaseUrl", LLM_URL)
        page.fill("#llmApiKey", KEY)
        page.click("#llmSaveButton")
        page.wait_for_function("document.querySelector('#llmSettingsStatus').innerText === 'Saved.'")
        check("settings saved; key field cleared and only its last four characters shown",
              page.input_value("#llmApiKey") == "" and "…wxyz" in page.inner_text("#llmApiKeyHelp"))
        page.click("#llmTestButton")
        page.wait_for_function("document.querySelector('#llmSettingsStatus').innerText.includes('Connected')",
                               timeout=30000)
        check("connection test reports the model as available",
              "mock-model' is available" in page.inner_text("#llmSettingsStatus"))
        shot(page, "2_options_settings", clip={"x": 250, "y": 0, "width": 900, "height": 1000})
        settings_file = home / ".marti" / "llm_settings.json"
        check("settings file is readable only by its owner", (settings_file.stat().st_mode & 0o777) == 0o600)
        page.click("#optionsModal .modal-footer button")
        page.wait_for_selector("#optionsModal", state="hidden")

        # ---- generate
        page.wait_for_function("!document.querySelector('#narrativeGenerateButton').disabled")
        page.click("#narrativeGenerateButton")
        page.wait_for_selector("#narrativeProgress", state="visible")
        progress_text = page.inner_text("#narrativeProgressText")
        shot(page, "3_card_generating", clip={"x": 104, "y": 480, "width": 1296, "height": 200})
        page.wait_for_selector("#narrativeContent", state="visible", timeout=120000)
        check("progress is shown while generating", bool(progress_text), progress_text)
        check("narrative summary appears on the card",
              page.inner_text("#narrativeSummary").startswith("Klebsiella pneumoniae dominates"))
        check("button now offers to regenerate", page.inner_text("#narrativeGenerateButton") == "Regenerate")
        check("automatic checks flag the organism named as absent",
              "Listeria monocytogenes" in page.inner_text("#narrativeChecks"))
        check("footer names model, provider and basis",
              page.inner_text("#narrativeFooter").startswith("Written by mock-model (local or OpenAI-compatible server)"))
        shot(page, "4_card_narrative", clip={"x": 104, "y": 480, "width": 1296, "height": 330})
        page.click("#narrativeToggle")
        check("full analysis expands to four sections",
              page.locator("#narrativeSections h6").count() == 4)
        check("model output is shown as text, not HTML (no injected image, no script run)",
              page.locator("#narrativeSections img").count() == 0 and page.evaluate("window.__xss") is None
              and "<img src=x" in page.inner_text("#narrativeSections"))
        shot(page, "5_card_expanded", full_page=True)
        doc = json.loads((P8 / "narrative.json").read_text())["narrative"]
        check("narrative.json written into the sample folder", doc["model"] == "mock-model"
              and doc["basis"]["readsAnalysed"] == 25705)
        check("the LLM received the key, as a header", LLM_REQUESTS and LLM_REQUESTS[-1]["auth"] == f"Bearer {KEY}")
        check("no errors in the page", not errors, errors[:3])

        # ---- a second user sees it; the key never reached any browser
        page2 = ctx.browser.new_context().new_page()
        page2.on("websocket", lambda ws: ws.on("framereceived", lambda f: frames.append(str(f))))
        page2.goto(f"{base}/sample/{uuid_of(P8)}")
        page2.wait_for_selector("#narrativeContent", state="visible", timeout=30000)
        check("another browser sees the same narrative", "16,774" in page2.inner_text("#narrativeSummary"))
        check(f"API key absent from all {len(frames)} socket messages and the page HTML",
              not any(KEY in f for f in frames) and KEY not in page.content() and KEY not in page2.content())

        # ---- stale when more reads arrive
        sj = json.loads((P8 / "sample.json").read_text())
        sj["sample"]["readsAnalysed"] = 30000
        (P8 / "sample.json").write_text(json.dumps(sj))
        page.wait_for_selector("#narrativeStale", state="visible", timeout=40000)
        check("card says when the narrative is out of date",
              "25,705" in page.inner_text("#narrativeStale") and "30,000" in page.inner_text("#narrativeStale"))
        shot(page, "6_card_stale", clip={"x": 104, "y": 480, "width": 1296, "height": 380})
        browser.close()
finally:
    gui.terminate()

# ---------------------------------------------------------------- restricted mode
settings_before = (home / ".marti" / "llm_settings.json").read_text()
narrative_before = (P8 / "narrative.json").read_text()
n_llm = len(LLM_REQUESTS)
rport = free_port()
rgui = start_gui(rport, "-r")
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        got = []
        page.on("websocket", lambda ws: ws.on("framereceived", lambda f: got.append(str(f))))
        page.goto(f"http://127.0.0.1:{rport}/sample/{uuid_of(P8)}")
        page.wait_for_selector("#narrativeContent", state="visible", timeout=30000)
        check("restricted mode: existing narrative is shown", "Klebsiella" in page.inner_text("#narrativeSummary"))
        check("restricted mode: no Generate/Regenerate button", not page.is_visible("#narrativeGenerateButton"))
        page.click("a[data-target='#optionsModal']")
        page.wait_for_selector("#optionsModal", state="visible")
        page.wait_for_timeout(1500)
        check("restricted mode: no AI settings in Options", not page.is_visible("#llmSettingsSection"))
        # forged requests straight to the server
        page.evaluate("""() => {
            socket.emit('narrative-generate-request', {clientId: uuid});
            socket.emit('llm-settings-save', {clientId: uuid, settings: {provider: 'openai-compatible',
                model: 'evil', baseUrl: 'http://attacker.example/v1'}});
            socket.emit('llm-settings-test', {clientId: uuid});
        }""")
        page.wait_for_timeout(3000)
        joined = " ".join(got)
        check("restricted mode: forged generate request refused by the server",
              "cannot be generated in restricted mode" in joined)
        check("restricted mode: forged settings change refused", "cannot be changed in restricted mode" in joined)
        check("restricted mode: settings, narrative and LLM untouched",
              (home / ".marti" / "llm_settings.json").read_text() == settings_before
              and (P8 / "narrative.json").read_text() == narrative_before and len(LLM_REQUESTS) == n_llm)
        page.goto(f"http://127.0.0.1:{rport}/sample/{uuid_of(P103)}")
        page.wait_for_function("document.querySelector('#narrativeEmpty') && "
                               "document.querySelector('#narrativeEmpty').innerText.includes('No narrative')",
                               timeout=30000)
        check("restricted mode: sample without a narrative says so, with no button",
              page.inner_text("#narrativeEmpty") == "No narrative analysis has been generated for this sample."
              and not page.is_visible("#narrativeGenerateButton"))
        shot(page, "7_restricted_no_narrative", clip={"x": 104, "y": 480, "width": 1296, "height": 160})
        browser.close()
finally:
    rgui.terminate()
    llm.shutdown()

print("\nALL GUI CHECKS PASSED" if not failures else f"\n{failures} GUI CHECK(S) FAILED")
sys.exit(1 if failures else 0)
