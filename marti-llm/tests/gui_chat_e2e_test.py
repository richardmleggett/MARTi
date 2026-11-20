"""
End-to-end test of the AI chat panel in the real MARTi GUI: GUI server (Node) + marti_llm.chat (Python) + a
scripted mock OpenAI-compatible LLM that calls tools + a headless browser.

    python tests/gui_chat_e2e_test.py /path/to/MARTi [screenshot_dir]

Needs Node.js with the GUI's dependencies installed (npm install in gui/UI) and Python Playwright with Chromium.
Uses a temporary copy of MARTi's example data and a temporary home folder for the settings file.
"""
import json
import os
import re
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
MARTI = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent  # marti-llm lives in MARTi
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
GUI = MARTI / "gui" / "UI"
tmp = Path(tempfile.mkdtemp())
data = tmp / "output"
shutil.copytree(MARTI / "gui" / "output", data)
# collection metadata in the engine's format, for the Samples page searches
# (coordinates as the GUI's sample map reads them: "location" with "locationName")
for name, md in {"BAMBI_P8_1D_19092017": {"location": "52.6309, 1.2974", "locationName": "Norwich",
                                          "sampleDate": "16/07/25"},
                 "BAMBI_P103M_400ng_RAD4_20122017": {"sampleLocation": "Brancaster", "sampleDate": "20/08/25"},
                 "MARC_Yare_101117_F2_no_control": {"sampleLocation": "Hickling Broad", "sampleDate": "01/07/25"},
                 "MARC_Yare_171117_F1_no_control": {"location": "52.75, 1.60", "locationName": "Ludham",
                                                    "sampleDate": "01/12/24"}}.items():
    (data / name / "marti" / name / "metadata.json").write_text(json.dumps({"id": name, "runId": name, **md}))
SUMMER = sorted(["BAMBI_P8_1D_19092017", "BAMBI_P103M_400ng_RAD4_20122017", "MARC_Yare_101117_F2_no_control"])
ECOLI = sorted(["BAMBI_P8_1D_19092017", "BAMBI_P205G_1D_12012018", "BAMBI_P116I_SQK108_02022018"])
home = tmp / "home"
home.mkdir()
KEY = "sk-chat-e2e-SECRET-5678abcd"
BAMBI = ["BAMBI_P8_1D_19092017", "BAMBI_P103M_400ng_RAD4_20122017", "BAMBI_P106I_LSQK108_02022018",
         "BAMBI_P116I_SQK108_02022018"]
P8 = BAMBI[0]
failures = 0


def check(label, ok, detail=""):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + label + (f"  [{detail}]" if detail and not ok else ""), flush=True)


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# ---------------------------------------------------------------- scripted mock LLM (OpenAI-compatible)
LLM = []   # {"auth", "body"} per request


def last_user(body):
    # the latest question only (unanswered earlier questions are merged into the same message)
    return next(m["content"] for m in reversed(body["messages"]) if m["role"] == "user").split("\n\n")[-1]


def samples_page_reply(q, messages):
    """find_samples, then select_samples when asked to select, then an answer with sample links."""
    last_q = max(i for i, m in enumerate(messages) if m["role"] == "user")
    called = [tc["function"]["name"] for m in messages[last_q:] if m["role"] == "assistant"
              for tc in m.get("tool_calls") or []]
    results = [json.loads(m["content"]) for m in messages[last_q:] if m["role"] == "tool"]
    if not called:
        crit = {"date_from": "2025-06-01", "date_to": "2025-08-31"} if "summer" in q else {"taxon": "E. coli"}
        return 200, {"tool_calls": [("find_samples", crit)]}
    keys = [m["sample"] for m in results[0]["matched"]]
    if "select" in q.lower() and "select_samples" not in called:
        return 200, {"tool_calls": [("select_samples", {"samples": keys, "mode": "add" if "also" in q.lower() else "replace"})]}
    links = ", ".join(f"[{k.split('/')[-1]}](marti:sample/{k})" for k in keys)
    if "select" in q.lower():
        return 200, {"content": f"I selected {len(keys)} samples: {links}. See the [table](marti:samples-table)."}
    return 200, {"content": f"{len(keys)} samples contain *Escherichia coli*: {links}."}


def reply(body):
    """Tool calls first, then an answer; behaviour chosen by the question."""
    q = last_user(body)
    system = body["messages"][0]["content"]
    tool_msgs = [m for m in body["messages"] if m["role"] == "tool"]
    if "Samples page" in system:
        return samples_page_reply(q, body["messages"])
    if q.lower().startswith("open the treemap"):
        if not tool_msgs:
            return 200, {"tool_calls": [("open_view", {"target": "treemap", "sample": "P8_1D"})]}
        return 200, {"content": "Opening the treemap for BAMBI_P8_1D_19092017."}
    if "fail" in q:
        return 500, {"error": {"message": "mock model overloaded"}}
    if "slow" in q:
        time.sleep(20)
    if "groups" in q.lower() and not tool_msgs:
        groups = json.loads(re.search(r"groups=(\{.*?\})\.", system).group(1))
        return 200, {"tool_calls": [("alpha_diversity", {"groups": groups, "rank": "genus"}),
                                    ("compare_groups", {"groups": groups})]}
    if "dashboard question" in q and not tool_msgs:
        return 200, {"tool_calls": [("sample_overview", {"sample": f"{P8}/{P8}"})]}
    if "dashboard question" in q:
        return 200, {"content": "This sample is dominated by Klebsiella; see the [taxa table](marti:taxa-table) "
                                "and the [AMR table](marti:amr-table)."}
    return 200, {"content": "**Yes**: the groups differ. Richness is higher in the late group, see the "
                            "[diversity plot](marti:diversity-plot), and the groups separate in the "
                            "[PCoA](marti:ordination).\n\n- [P8](marti:sample/" + f"{P8}/{P8}" + ") stands out\n"
                            "- [secret](marti:admin-panel) is not a real place\n"
                            "- <img src=x onerror=\"window.__xss=1\"> stays text"}


class MockLLM(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send(200, {"data": [{"id": "mock-model"}]})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["content-length"])))
        LLM.append({"auth": self.headers.get("authorization"), "body": body})
        time.sleep(1.2)   # long enough for the browser to show progress
        code, r = reply(body)
        if code != 200:
            self._send(code, r)
            return
        msg = {"role": "assistant", "content": r.get("content")}
        if r.get("tool_calls"):
            msg["tool_calls"] = [{"id": f"c{len(LLM)}_{i}", "type": "function",
                                  "function": {"name": n, "arguments": json.dumps(a)}}
                                 for i, (n, a) in enumerate(r["tool_calls"])]
        self._send(200, {"choices": [{"message": msg}], "usage": {"prompt_tokens": 900, "completion_tokens": 80}})


llm = HTTPServer(("127.0.0.1", 0), MockLLM)
threading.Thread(target=llm.serve_forever, daemon=True).start()
LLM_URL = f"http://127.0.0.1:{llm.server_port}/v1"


# ---------------------------------------------------------------- GUI
def start_gui(port, *extra):
    env = {**os.environ, "HOME": str(home)}
    env.pop("MARTI_LLM_API_KEY", None)
    log = open(tmp / f"gui_{port}.log", "w")
    p = subprocess.Popen(["node", "index.js", "--marti", str(data), "-p", str(port),
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


def shot(page, name, **kw):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SHOTS / f"{name}.png"), **kw)


def open_compare(page, base):
    page.goto(base)
    page.wait_for_function("typeof samplePageDataTable !== 'undefined' && samplePageDataTable && typeof samplePageDataTable.rows === 'function' && samplePageDataTable.rows().count() >= 9",
                           timeout=60000)
    page.wait_for_timeout(2000)
    # select and open in one step: the table is redrawn (losing selections) whenever sample data arrives
    page.evaluate("""names => { samplePageDataTable.rows().every(function () {
        if (names.includes(this.data()[12])) $(this.node()).addClass('checkSelected'); });
        $('#compare-item').trigger('click'); }""", BAMBI)
    page.wait_for_selector("#compareSamplesCard", state="attached")
    page.wait_for_function("document.querySelectorAll('#compareSampleNameList tr').length === 4", timeout=30000)


def ask(page, text):
    page.fill("#martiChatInput", text)
    page.press("#martiChatInput", "Enter")


def answers(page):
    return page.locator("#martiChatMessages .martiChatAssistant:not(.martiChatWaiting)")


port = free_port()
gui = start_gui(port)
base = f"http://127.0.0.1:{port}"
frames = []

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=2,
                                  accept_downloads=True)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("websocket", lambda ws: ws.on("framereceived", lambda f: frames.append(str(f))))

        page.goto(base)
        page.wait_for_timeout(3000)
        check("Ask AI is offered on the Samples page", page.is_visible("#martiChatLauncher"))

        open_compare(page, base)
        page.wait_for_selector("#martiChatLauncher", state="visible", timeout=15000)
        page.click("#martiChatLauncher")
        page.wait_for_selector("#martiChatPanel", state="visible")
        check("before setup: the panel explains how to choose a model, and input is off",
              "choose an AI model in Options" in page.inner_text("#martiChatNotice")
              and page.is_disabled("#martiChatInput"))

        page.evaluate("""([url, key]) => socket.emit('llm-settings-save', {clientId: uuid, settings:
            {provider: 'openai-compatible', model: 'mock-model', baseUrl: url, apiKey: key}})""", [LLM_URL, KEY])
        page.wait_for_selector(".martiChatSuggestion", timeout=15000)
        check("once a model is saved the panel is ready, with suggested questions",
              page.is_enabled("#martiChatInput") and page.locator(".martiChatSuggestion").count() == 5
              and not page.is_visible("#martiChatNotice"))

        page.evaluate("""s => { s.forEach((n, i) => setCompareSampleGroup(n, n, i < 2 ? 'early' : 'late'));
                               updateCompareSampleGroupInputs(); $('.compareSampleGroupInput').first().trigger('change'); }""",
                      BAMBI)
        page.wait_for_function("document.querySelector('#martiChatContext').innerText.includes('late (2)')")
        check("header names the samples and groups the chat is about",
              page.inner_text("#martiChatContext") ==
              "About the 4 samples being compared · groups: early (2), late (2)", page.inner_text("#martiChatContext"))
        shot(page, "chat_1_ready")

        # ---- a question with tools and links
        LLM.clear()
        ask(page, "Do the groups differ in diversity?")
        page.wait_for_selector(".martiChatWaiting")
        page.wait_for_function("document.querySelector('.martiChatWaiting') && "
                               "document.querySelector('.martiChatWaiting').innerText.includes('Running')", timeout=20000)
        stop_shown = page.is_visible("#martiChatStop")
        shot(page, "chat_2_working")
        page.wait_for_function("document.querySelectorAll('#martiChatMessages .martiChatAssistant:not(.martiChatWaiting)').length === 1",
                               timeout=60000)
        progress = [f for f in frames if "chat-progress" in f]
        check("progress names each analysis being run, and Stop is offered while waiting",
              any("Running: Alpha diversity" in f for f in progress)
              and any("Running: Compare groups of samples" in f for f in progress) and stop_shown, progress[:6])
        a = answers(page).first
        links = a.locator("a.martiChatLink")
        check("answer shows three GUI links; the unknown place stays plain text",
              links.count() == 3 and [links.nth(i).get_attribute("data-target") for i in range(3)] ==
              ["diversity-plot", "ordination", f"sample/{P8}/{P8}"] and "secret is not a real place" in a.inner_text(),
              a.inner_html()[:400])
        check("answer formatting: bold and a bulleted list, model named",
              a.locator("strong").first.inner_text() == "Yes" and a.locator("li").count() == 3
              and "mock-model" in a.locator(".martiChatMeta").inner_text())
        check("model output is text, not HTML", a.locator("img").count() == 0 and page.evaluate("window.__xss") is None
              and "<img src=x" in a.inner_text())
        first = LLM[0]["body"]
        system = first["messages"][0]["content"]
        check("the model was told the 4 open samples, their groups and what the user is viewing",
              all(n in system for n in BAMBI) and "MARC" not in system and "group early" in system
              and "compare page" in system.lower() and "currently viewing the Taxonomy tab" in system, system[:600])
        tool_out = [m["content"] for m in LLM[1]["body"]["messages"] if m["role"] == "tool"]
        check("the tools ran on the server with the user's groups",
              len(tool_out) == 2 and all("error" not in json.loads(t) for t in tool_out)
              and '"late"' in tool_out[1], [t[:200] for t in tool_out])
        check("the LLM received the key as a header", LLM[0]["auth"] == f"Bearer {KEY}")
        shot(page, "chat_3_answer")

        # ---- links take the user to the plots, panel stays open
        def lands_at_top(card):
            """The card ends up just below the fixed bars at the top of the window."""
            page.wait_for_timeout(3500)
            return page.evaluate("""id => Math.abs(document.getElementById(id).getBoundingClientRect().top -
                                                 martiChatTopOffset()) <= 2""", card)

        links.nth(0).click()
        page.wait_for_function("document.getElementById('compareDiversityPlotCard').classList.contains('martiChatFlash')",
                               timeout=5000)
        check("diversity link opens the Diversity tab and highlights the plot; panel stays open",
              page.get_attribute("#compareDiversityTab", "aria-selected") == "true" and page.is_visible("#martiChatPanel"))
        check("... and scrolls the plot to the top of the window", lands_at_top("compareDiversityPlotCard"))
        shot(page, "chat_4_link_diversity")
        links.nth(1).click()
        check("PCoA link opens Sample relationships with the PCoA at the top",
              lands_at_top("compareOrdinationCard") and page.get_attribute("#compareOrdinationTab", "aria-selected") == "true")
        for target, card in [("distance-matrix", "compareDistanceMatrixCard"), ("clustering", "compareDendrogramCard"),
                             ("taxa-tree", "compareTaxaTreeCard"), ("samples-table", "compareSamplesCard"),
                             ("shared-taxa", "compareUpSetCard")]:
            page.evaluate("t => martiChatGo(t)", target)
            check(f"'{target}' link puts that card at the top of the window, opening it if collapsed",
                  lands_at_top(card) and page.is_visible("#" + card))

        # ---- download
        with page.expect_download() as dl:
            page.click("#martiChatDownload")
        text = Path(dl.value.path()).read_text()
        check("download: Markdown transcript with samples, question and answer, no link syntax",
              dl.value.suggested_filename.endswith(".md") and "Comparing 4 samples:" in text
              and "group late" in text and "Do the groups differ" in text and "the diversity plot" in text
              and "marti:" not in text, text[:300])

        # ---- errors, retry and stop
        ask(page, "please fail")
        page.wait_for_selector(".martiChatError", timeout=30000)
        check("a model error is shown with Try again", "mock model overloaded" in page.inner_text(".martiChatError")
              and page.is_visible(".martiChatRetry"))
        ask(page, "slow one")
        page.wait_for_selector("#martiChatStop", state="visible")
        page.wait_for_timeout(1500)
        page.click("#martiChatStop")
        page.wait_for_function("document.querySelector('#martiChatStop').hidden", timeout=15000)
        check("Stop ends the wait without an answer or error", answers(page).count() == 1
              and page.locator(".martiChatError").count() == 0 and page.is_enabled("#martiChatSend"))

        # ---- sample link opens its dashboard; the dashboard has its own conversation
        page.click(f"a.martiChatLink[data-target='sample/{P8}/{P8}']")
        page.wait_for_selector("#narrativeCard", timeout=30000)
        page.wait_for_function("document.querySelector('#martiChatContext').innerText.startsWith('About sample')",
                               timeout=20000)
        check("sample link opens that sample's dashboard; panel follows with a new conversation",
              page.inner_text("#martiChatContext") == f"About sample {P8}"
              and page.locator(".martiChatSuggestion").count() == 4 and answers(page).count() == 0)
        LLM.clear()
        ask(page, "A dashboard question")
        page.wait_for_function("document.querySelectorAll('#martiChatMessages .martiChatAssistant:not(.martiChatWaiting)').length === 1",
                               timeout=60000)
        system = LLM[0]["body"]["messages"][0]["content"]
        check("dashboard question: the model sees only this sample",
              "dashboard of one sample" in system and P8 in system and BAMBI[1] not in system)
        answers(page).first.locator("a.martiChatLink[data-target='amr-table']").click()
        page.wait_for_timeout(400)
        check("dashboard link opens the AMR tab", page.get_attribute("#dashboardAmrTab", "aria-selected") == "true")
        shot(page, "chat_5_dashboard")

        # ---- conversations survive a reload, per set of samples
        open_compare(page, base)
        page.wait_for_selector("#martiChatPanel", state="visible", timeout=15000)
        page.wait_for_function("document.querySelectorAll('#martiChatMessages .martiChatUser').length >= 3", timeout=15000)
        check("after a reload the comparison's conversation is back (panel reopened)",
              "Do the groups differ" in page.inner_text("#martiChatMessages") and answers(page).count() == 1)
        page.click("#martiChatClear")
        check("clear asks for a second click", "again" in page.inner_text("#martiChatNotice"))
        page.click("#martiChatClear")
        check("cleared", page.locator(".martiChatUser").count() == 0 and page.locator(".martiChatSuggestion").count() == 5)

        # ---- Samples page: find, list and select samples
        def selected_rows():
            return sorted(page.evaluate("""() => { const out = []; samplePageDataTable.rows().every(function () {
                if ($(this.node()).hasClass('checkSelected')) out.push(this.data()[12]); }); return out; }"""))

        page.click("#samples-item")
        page.wait_for_function("document.querySelector('#martiChatContext') && "
                               "document.querySelector('#martiChatContext').innerText.includes('listed')", timeout=20000)
        page.evaluate("() => { samplePageDataTable.rows().every(function () { $(this.node()).removeClass('checkSelected'); });"
                      " emitSelectedCompareSamples(); }")
        page.wait_for_function("document.querySelector('#martiChatContext').innerText.endsWith('0 selected')")
        check("Samples page panel: its own conversation, suggestions and context",
              page.inner_text("#martiChatContext") == "Find and select from the 9 samples listed · 0 selected"
              and page.locator(".martiChatSuggestion").count() == 4 and answers(page).count() == 0,
              page.inner_text("#martiChatContext"))
        LLM.clear()
        ask(page, "Select the samples from summer 2025")
        page.wait_for_selector(".martiChatSelection", timeout=60000)
        system = LLM[0]["body"]["messages"][0]["content"]
        check("the model gets a summary of the listed samples, not the selection it does not have",
              "Samples page, which lists 9 samples" in system and "2024-12-01 to 2025-08-20" in system
              and "2 samples have coordinates" in system and "No samples are selected" in system)
        check("'Select ...' ticks exactly the matching rows and says so",
              selected_rows() == SUMMER and page.inner_text(".martiChatSelection").startswith("3 samples selected.")
              and page.inner_text("#martiChatContext").endswith("3 selected"), selected_rows())
        shot(page, "chat_6_samples_selected")
        page.click(".martiChatUndo")
        page.wait_for_timeout(500)
        check("Undo restores the previous selection", selected_rows() == [] and
              page.inner_text(".martiChatSelection").startswith("Selection undone."))
        page.click(".martiChatUndo")
        page.wait_for_timeout(500)
        check("Redo applies it again", selected_rows() == SUMMER)
        LLM.clear()
        ask(page, "Also select the samples with E. coli")
        page.wait_for_function("document.querySelectorAll('.martiChatSelection').length === 2", timeout=60000)
        check("'Also select' adds to the selection", selected_rows() == sorted(set(SUMMER) | set(ECOLI)), selected_rows())
        ask(page, "List the samples with E. coli")
        page.wait_for_function("document.querySelectorAll('#martiChatMessages .martiChatAssistant:not(.martiChatWaiting)').length === 3",
                               timeout=60000)
        last = answers(page).nth(2)
        check("'List' answers with links to each sample and changes nothing",
              last.locator("a.martiChatLink").count() == 3 and last.locator(".martiChatSelection").count() == 0
              and selected_rows() == sorted(set(SUMMER) | set(ECOLI)))
        page.evaluate("martiChatGo('sample-map')")
        page.wait_for_timeout(3500)
        check("map link opens the sample map at the top of the window",
              page.is_visible("#sampleMap") and page.evaluate(
                  "Math.abs(document.getElementById('sampleMapCard').getBoundingClientRect().top - martiChatTopOffset()) <= 2"))
        answers(page).nth(0).locator(".martiChatCompare").click()
        page.wait_for_function("document.querySelectorAll('#compareSampleNameList tr').length === 5", timeout=30000)
        check("Compare opens the Compare page with the selected samples", page.locator("#compareSampleNameList tr").count() == 5)

        # ---- "Open the treemap for sample X" from another page
        LLM.clear()
        ask(page, "Open the treemap for sample P8")
        page.wait_for_selector("#narrativeCard", timeout=60000)
        page.wait_for_timeout(4500)
        tools = [t["function"]["name"] for t in LLM[0]["body"]["tools"]]
        check("open_view offered on the Compare page, with the dashboard views",
              "open_view" in tools and "treemap" in next(t["function"]["description"] for t in LLM[0]["body"]["tools"]
                                                         if t["function"]["name"] == "open_view"))
        check("'Open the treemap for sample X' opens X's dashboard with the treemap at the top of the window",
              page.inner_text("#martiChatContext") == f"About sample {P8}" and page.evaluate(
                  "Math.abs(document.getElementById('treeMapCard').getBoundingClientRect().top - martiChatTopOffset()) <= 2"))
        shot(page, "chat_7_open_treemap")

        page.click("#martiChatClose")
        check("closed panel leaves the button", page.is_visible("#martiChatLauncher") and not page.is_visible("#martiChatPanel"))

        check(f"API key absent from all {len(frames)} socket messages and the page", not any(KEY in f for f in frames)
              and KEY not in page.content())
        check("no errors in the page", not errors, errors[:3])
        browser.close()
finally:
    gui.terminate()


# ---------------------------------------------------------------- restricted mode
def restricted(*flags):
    rport = free_port()
    rgui = start_gui(rport, "-r", *flags)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": 1400, "height": 1000})
            got = []
            page.on("websocket", lambda ws: ws.on("framereceived", lambda f: got.append(str(f))))
            open_compare(page, f"http://127.0.0.1:{rport}")
            page.wait_for_timeout(3000)
            visible = page.is_visible("#martiChatLauncher")
            n = len(LLM)
            page.evaluate("""() => socket.emit('chat-ask', {clientId: uuid, requestId: 'forged', page: 'compare',
                              messages: [{role: 'user', content: 'What is in these samples?'}]})""")
            page.wait_for_timeout(8000)
            browser.close()
            return visible, " ".join(got), len(LLM) - n
    finally:
        rgui.terminate()


visible, got, calls = restricted()
check("restricted mode: no chat button", not visible)
check("restricted mode: a forged question is refused by the server, no model call",
      "not available in restricted mode" in got and calls == 0)
visible, got, calls = restricted("--restricted-chat")
check("restricted mode with --restricted-chat: chat offered and answered", visible and calls >= 1
      and "chat-answer" in got)
llm.shutdown()

print("\nALL GUI CHAT CHECKS PASSED" if not failures else f"\n{failures} GUI CHAT CHECK(S) FAILED")
sys.exit(1 if failures else 0)
