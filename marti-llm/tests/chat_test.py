"""
GUI chat tests against a scripted mock LLM server (OpenAI-compatible and Anthropic formats).

    python tests/chat_test.py /path/to/MARTi/gui/output
"""
import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from marti_llm import chat as C  # noqa: E402
from marti_llm.providers import LLMConfig, ProviderError  # noqa: E402

OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / "gui" / "output"
BAMBI = ["BAMBI_P8_1D_19092017", "BAMBI_P103M_400ng_RAD4_20122017", "BAMBI_P106I_LSQK108_02022018",
         "BAMBI_P116I_SQK108_02022018"]
MARC = ["MARC_Yare_101117_F2_no_control", "MARC_Yare_171117_F1_no_control"]


def sdir(name):
    return str(OUT / name / "marti" / name)


KEY = "sk-test-SECRET-chat-key-9876"
failures = 0


def check(label, ok, detail=""):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + label + (f"  [{detail}]" if detail and not ok else ""))


SCRIPT = []   # what the mock answers next: {"text": ...} or {"tools": [(name, args), ...]}
SEEN = []     # request bodies


class Mock(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["content-length"])))
        SEEN.append((self.path, dict(self.headers), body))
        step = SCRIPT.pop(0) if SCRIPT else {"text": "Done."}
        n = len(SEEN)
        if self.path.endswith("/v1/messages"):
            content = [{"type": "text", "text": step.get("text", "")}] if step.get("text") else []
            content += [{"type": "tool_use", "id": f"tu_{n}_{i}", "name": nm, "input": a}
                        for i, (nm, a) in enumerate(step.get("tools", []))]
            self._send({"content": content, "usage": {"input_tokens": 100, "output_tokens": 20}})
        else:
            msg = {"role": "assistant", "content": step.get("text")}
            if step.get("tools"):
                msg["tool_calls"] = [{"id": f"call_{n}_{i}", "type": "function",
                                      "function": {"name": nm, "arguments": a if isinstance(a, str) else json.dumps(a)}}
                                     for i, (nm, a) in enumerate(step["tools"])]
            self._send({"choices": [{"message": msg}], "usage": {"prompt_tokens": 100, "completion_tokens": 20}})


srv = HTTPServer(("127.0.0.1", 0), Mock)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{srv.server_port}"
LINKS = [{"id": "diversity-plot", "description": "Alpha diversity plot by sample or group"},
         {"id": "ordination", "description": "PCoA ordination"},
         {"id": "bad target!", "description": "ignored"}]


def ctx(question="How do the groups differ?", **kw):
    c = {"page": "compare",
         "samples": [{"dir": sdir(n), "ref": {"runId": n, "name": n}} for n in BAMBI],
         "groups": {"early": [sdir(BAMBI[0]), sdir(BAMBI[1])], "late": [sdir(BAMBI[2]), sdir(BAMBI[3])]},
         "view": {"tab": "Diversity", "rank": "genus", "minSupport": 0.1},
         "links": LINKS,
         "messages": [{"role": "user", "content": question}]}
    c["samples"][0]["label"] = "Patient 8"
    c.update(kw)
    return c


def tool_results(body):
    """Tool results the model was sent, in either format."""
    out = []
    for m in body["messages"]:
        if m.get("role") == "tool":
            out.append(m["content"])
        if m.get("role") == "user" and isinstance(m.get("content"), list):
            out += [b["content"] for b in m["content"] if b.get("type") == "tool_result"]
    return out


# ---- 1. schemas
schemas = {t[2]["name"]: t[2] for t in C.chat_tools()}
check("18 read-only tools, no narrative writing", len(schemas) == 18 and "save_narrative" not in schemas
      and "get_narrative_inputs" not in schemas, sorted(schemas))
check("project parameters are hidden; groups is an object of string arrays",
      all("project" not in s["schema"]["properties"] and "reference_project" not in s["schema"]["properties"]
          for s in schemas.values())
      and schemas["compare_groups"]["schema"]["properties"]["groups"] ==
      {"type": "object", "additionalProperties": {"type": "array", "items": {"type": "string"}}}
      and schemas["taxa_table"]["schema"]["required"] == ["sample"]
      and schemas["taxa_table"]["schema"]["properties"]["min_support"] == {"type": "number", "default": 0.1})

# ---- 2. OpenAI-compatible: tools, groups, links
cfg = LLMConfig("openai-compatible", "mock-model", "", BASE + "/v1")
SCRIPT[:] = [
    {"tools": [("list_samples", {}), ("compare_groups", {"groups": {
        "early": [f"{BAMBI[0]}/{BAMBI[0]}", f"{BAMBI[1]}/{BAMBI[1]}"],
        "late": [f"{BAMBI[2]}/{BAMBI[2]}", f"{BAMBI[3]}/{BAMBI[3]}"]}, "rank": "genus"})]},
    {"tools": [("taxa_table", {"sample": "MARC_Yare_101117_F2_no_control"}), ("no_such_tool", {}),
               ("taxa_table", {"sample": BAMBI[0], "project": "bambi"}), ("taxa_table", "{not json")]},
    {"text": "<think>hmm</think>The groups differ in **richness**: see the [diversity plot](marti:diversity-plot) "
             "and [PCoA](marti:ordination). [Patient 8](marti:sample/BAMBI_P8_1D_19092017) stands out. "
             "Ignore [this](marti:secret-view), [that](https://evil.example/x) and [it](marti:sample/MARC_Yare)."}]
SEEN.clear()
events = []
r = C.answer(ctx(), cfg, events.append)
bodies = [b for _, _, b in SEEN]
sysmsg = bodies[0]["messages"][0]["content"]
check("system prompt lists the open samples, the user's name for one, groups, view and link targets",
      all(n in sysmsg for n in BAMBI) and "the user calls it 'Patient 8'" in sysmsg and "group early" in sysmsg
      and '"late": [' in sysmsg and "rank genus" in sysmsg and "minimum support 0.1%" in sysmsg
      and "- diversity-plot: Alpha diversity plot" in sysmsg and "bad target" not in sysmsg
      and "MARC" not in sysmsg)
res2 = tool_results(bodies[1])
inv = json.loads(res2[0])
check("tools see only the open samples", inv["n_samples"] == 4 and all("BAMBI" in s["key"] for s in inv["samples"]),
      inv.get("n_samples"))
cg = json.loads(res2[1])
check("compare_groups ran on the user's groups", "error" not in cg and "early" in json.dumps(cg)
      and "late" in json.dumps(cg), str(cg)[:300])
res3 = tool_results(bodies[2])[2:]
check("other samples, unknown tools, hidden arguments and bad JSON come back to the model as errors",
      len(res3) == 4 and all("error" in json.loads(x) for x in res3)
      and "project" in json.loads(res3[2])["error"], res3)
check("progress events name each analysis", [e["name"] for e in events if e["event"] == "tool"] ==
      ["list_samples", "compare_groups", "taxa_table", "no_such_tool", "taxa_table", "taxa_table"]
      and any(e.get("message") == "Running: Compare groups of samples" for e in events))
a = r["answer"]
check("answer: reasoning removed, allowed links kept, sample link rewritten to the GUI's ids",
      a.startswith("The groups differ") and "[diversity plot](marti:diversity-plot)" in a
      and "[PCoA](marti:ordination)" in a
      and f"[Patient 8](marti:sample/{BAMBI[0]}/{BAMBI[0]})" in a, a)
check("answer: unknown targets, web links and samples not open become plain text",
      "Ignore this, that and it." in a and "evil" not in a and "secret" not in a, a)
check("result reports model, tools and usage", r["model"] == "mock-model" and r["tools_used"][0] == "list_samples"
      and r["usage"]["input_tokens"] == 300)

# ---- 3. Anthropic format, history, and the step limit
cfg_a = LLMConfig("anthropic", "claude-mock", KEY, BASE)
old_turns = C.MAX_TURNS
C.MAX_TURNS = 2
SCRIPT[:] = [{"tools": [("alpha_diversity", {"rank": "species"})]},
             {"tools": [("sequencing_saturation", {"sample": BAMBI[0]})]},
             {"text": "Diversity is highest in P8."}]
SEEN.clear()
history = [{"role": "assistant", "content": "orphan greeting"},
           {"role": "user", "content": "first question"}, {"role": "assistant", "content": "first answer"},
           {"role": "user", "content": "unanswered"}, {"role": "user", "content": "which is most diverse?"}]
r = C.answer(ctx(messages=history, page="dashboard",
                 samples=[{"dir": sdir(BAMBI[0]), "ref": {"runId": BAMBI[0], "name": BAMBI[0]}}], groups={}), cfg_a)
C.MAX_TURNS = old_turns
b0, b2 = SEEN[0][2], SEEN[2][2]
check("Anthropic: key in x-api-key header, tools declared, system separate",
      SEEN[0][1].get("x-api-key") == KEY and len(b0["tools"]) == 19 and b0["tools"][-1]["name"] == "open_view" and "dashboard of one sample" in b0["system"])
check("history starts with the user and merges a question that had no answer",
      [m["role"] for m in b0["messages"]] == ["user", "assistant", "user"]
      and b0["messages"][2]["content"] == "unanswered\n\nwhich is most diverse?")
check("after the step limit the model must answer (tools declared, tool_choice none, told to finish)",
      b2.get("tool_choice") == {"type": "none"} and "tools" in b2
      and "used all the analysis steps" in json.dumps(b2["messages"][-1]))
check("Anthropic tool results reach the model", any('"S"' in x or "shannon" in x for x in tool_results(b2)))
check("final answer returned", r["answer"] == "Diversity is highest in P8.")

# ---- 4. errors
for label, c, want in [("no samples", ctx(samples=[]), "No samples"),
                       ("no question", ctx(messages=[{"role": "assistant", "content": "hi"}]), "no question")]:
    try:
        C.answer(c, cfg)
        check(f"{label} is refused", False)
    except ValueError as e:
        check(f"{label} is refused", want in str(e), str(e))
SCRIPT[:] = [{"text": "<think>only thinking</think>"}]
try:
    C.answer(ctx(), cfg)
    check("an empty answer is an error", False)
except ProviderError as e:
    check("an empty answer is an error", "empty answer" in str(e))

# ---- 6. Finding and selecting samples (the Samples page)
import shutil, tempfile  # noqa: E401,E402
from marti_llm import analysis as A  # noqa: E402
tmp = Path(tempfile.mkdtemp())
META = {  # sample: metadata.json, in the engine's format
    BAMBI[0]: {"sampleLocation": "52.6309, 1.2974", "sampleDate": "16/07/25", "keywords": "gut, infant, "},
    BAMBI[1]: {"sampleLocation": "Brancaster", "sampleDate": "2025-08-20"},
    BAMBI[2]: {"sampleLocation": "City Centre (52.6290, 1.2920)", "sampleDate": "10/01/25"},
    BAMBI[3]: {},
    MARC[0]: {"sampleLocation": "Hickling Broad", "sampleDate": "01/07/25", "keywords": "water, broad, "},
    MARC[1]: {"location": "52.75, 1.60", "locationName": "Ludham", "sampleDate": "01/12/24"},  # GUI map format
}
dirs = {}
for n, md in META.items():
    shutil.copytree(OUT / n, tmp / n)
    d = tmp / n / "marti" / n
    (d / "metadata.json").write_text(json.dumps({"id": n, "runId": n, **md}))
    dirs[n] = str(d)
store = C.ScopedStore(list(dirs.values()))
ss = store.samples()
key = {s.name: s.key for s in ss}


def names(r):
    return sorted(m["name"] for m in r["matched"])


r = A.find_samples(ss, date_from="2025-06-01", date_to="2025-08-31")
check("dates: summer 2025 (day-first and ISO dates); undated samples counted as excluded",
      names(r) == sorted([BAMBI[0], BAMBI[1], MARC[0]]) and r["excluded"].get("no collection date in metadata") == 1, r)
NORWICH = dict(near_lat=52.6309, near_lon=1.2974)
r = A.find_samples(ss, within_km=5 * 1.609344, **NORWICH)
check("distance: recorded coordinates, including 'name (lat, lon)'; others listed by location name",
      names(r) == sorted([BAMBI[0], BAMBI[2]]) and r["criteria"]["within_km"]["miles"] == 5.0
      and r["locations_without_coordinates"] == ["(no location)", "Brancaster", "Hickling Broad"]
      and "estimated_coordinates" in r["note"] and "warning" not in r, r)
r = A.find_samples(ss, within_km=30, estimated_coordinates={"hickling broad": [52.74, 1.57]}, **NORWICH)
est = [m for m in r["matched"] if m["coordinates_estimated"]]
check("estimated positions are used only when given, flagged per sample and warned about",
      names(r) == sorted([BAMBI[0], BAMBI[2], MARC[0], MARC[1]]) and [m["name"] for m in est] == [MARC[0]]
      and 20 < est[0]["distance_km"] < 25 and "estimated" in r["warning"], r)
r = A.find_samples(ss, taxon="E. coli")
check("taxon: abbreviation resolved; lowest non-zero threshold by default",
      r["criteria"]["taxon"]["name"] == "Escherichia coli" and r["n_matched"] >= 1
      and all(m["min_support"] == "0.005" and m["taxon_reads"] >= 1 for m in r["matched"]), r)
r1 = A.find_samples(ss, taxon="Escherichia coli", min_support=1.0)
check("taxon: a requested threshold is used, and finds fewer", r1["n_matched"] < r["n_matched"]
      and all(m["min_support"] == "1.0" for m in r1["matched"]), (r1["n_matched"], r["n_matched"]))
r = A.find_samples(ss, keywords=["water"], location=["broad", "nowhere"])
check("keywords and location words", names(r) == [MARC[0]], r)
big = [s for s in ss for _ in range(6)]  # 36 rows: more than COMPACT_ABOVE
r = A.find_samples(big, taxon="Bacteria", min_support=0.0)
check("many matches: short rows, counts by location and run, threshold listed once",
      r["n_matched"] > 30 and set(r["matched"][0]) <= {"sample", "date", "taxon_reads", "taxon_pct_of_classified"}
      and "by_location" in r["summary"] and r["criteria"]["taxon"]["min_support_used"] == ["0.0"]
      and "not_matched" not in r, {k: v for k, v in r.items() if k != "matched"})
r = A.find_samples(ss, within_km=100, **NORWICH)
check("samples with no location at all are not to be estimated; the samples that did not match are named",
      "Do not estimate" not in r["note"] and "Brancaster" in r["locations_without_coordinates"]
      and key[BAMBI[3]] in r["not_matched"])
check("control-like names are flagged, but not 'no_control'", A._CONTROL_NAME.search("NC_H2O_25-Jan")
      and "possible_controls_matched" not in A.find_samples(ss, name="MARC")
      and A.find_samples(ss, keywords=["water"])["n_matched"] == 1)
check("bad inputs are explained", "YYYY-MM-DD" in A.find_samples(ss, date_from="summer")["error"]
      and "near_lat" in A.find_samples(ss, within_km=5)["error"]
      and A.find_samples(ss, taxon="Notarealgenus")["found"] is False)

ctx_s = {"page": "samples", "samples": [{"dir": d, "ref": {"runId": n, "name": n}} for n, d in dirs.items()],
         "selected": [dirs[BAMBI[3]]], "links": [{"id": "samples-table", "description": "The table of samples"}],
         "messages": [{"role": "user", "content": "Select the samples from summer 2025"}]}
SCRIPT[:] = [{"tools": [("find_samples", {"date_from": "2025-06-01", "date_to": "2025-08-31"})]},
             {"tools": [("select_samples", {"samples": [key[BAMBI[0]], key[BAMBI[1]], key[MARC[0]]]}),
                        ("select_samples", {"samples": ["nope/nope"]}),
                        ("select_samples", {"samples": [key[BAMBI[0]]], "mode": "toggle"})]},
             {"text": "I selected 3 samples collected 1 June to 31 August 2025: "
                      f"[{BAMBI[0]}](marti:sample/{key[BAMBI[0]]})."}]
SEEN.clear()
r = C.answer(ctx_s, cfg)
system = SEEN[0][2]["messages"][0]["content"]
tool_names = [t["function"]["name"] for t in SEEN[0][2]["tools"]]
check("Samples page prompt: summary of runs, dates, locations, coordinates and the current selection",
      "Samples page, which lists 6 samples from 6 runs" in system and "2024-12-01 to 2025-08-20" in system
      and "Brancaster (1)" in system and "(coordinates only) (1)" in system and "Ludham (1)" in system and "(none) (1)" in system
      and "3 samples have coordinates" in system and "infant (1)" in system
      and f"Currently selected: 1 samples: {key[BAMBI[3]]}" in system and "summer" in system)
check("select_samples is offered on the Samples page only", "select_samples" in tool_names
      and "find_samples" in tool_names and "select_samples" not in schemas)
res = [json.loads(x) for x in tool_results(SEEN[2][2])][1:]  # after find_samples
check("select_samples refuses unknown samples and modes", res[0]["ok"] and "Not samples on this page" in res[1]["error"]
      and "mode" in res[2]["error"], res)
check("the selection comes back with the answer, with the GUI's ids",
      r["actions"] == [{"type": "select", "mode": "replace", "samples": [
          {"runId": BAMBI[0], "name": BAMBI[0]}, {"runId": BAMBI[1], "name": BAMBI[1]},
          {"runId": MARC[0], "name": MARC[0]}]}]
      and f"(marti:sample/{BAMBI[0]}/{BAMBI[0]})" in r["answer"], r)
r = C.answer(ctx(question="hi"), cfg)
check("other pages return no actions", r["actions"] == [])
shutil.rmtree(tmp)

# ---- 7. Opening views ("open the treemap for sample X")
LISTED = [{"runId": "NorfolkSeq_24-07", "name": "Brancaster1_24-Jul"}, {"runId": "NorfolkSeq_24-07", "name": "Brancaster2_24-Jul"},
          {"runId": "NorfolkSeq_25-01", "name": "Brancaster1_25-Jan"}, {"runId": "R2", "name": "Brancaster1_24-Jul"}]
m = C.match_listed_sample
check("sample names: run/name, unique name, unique part; ambiguous ones return the candidates",
      m("NorfolkSeq_24-07/Brancaster1_24-Jul", LISTED)[0] == LISTED[0]
      and m("brancaster 2 24 jul", LISTED)[0] == LISTED[1] and m("1_25-Jan", LISTED)[0] == LISTED[2]
      and m("Brancaster1_24-Jul", LISTED)[0] is None and len(m("Brancaster1_24-Jul", LISTED)[1]) == 2
      and m("Foxley", LISTED) == (None, []))
DASH = [{"id": "treemap", "description": "Treemap of composition"}, {"id": "amr-table", "description": "AMR genes"}]
SCRIPT[:] = [{"tools": [("open_view", {"target": "treemap", "sample": "Brancaster2"}),
                        ("open_view", {"target": "sankey", "sample": "Brancaster2"}),
                        ("open_view", {"target": "treemap", "sample": "Brancaster1_24-Jul"}),
                        ("open_view", {"target": "treemap", "sample": "Nowhere"}),
                        ("open_view", {"target": "ordination"})]},
             {"text": "Opening the treemap for Brancaster2_24-Jul."}]
SEEN.clear()
r = C.answer(ctx(question="Open the treemap for Brancaster 2", listed=LISTED, dashboardLinks=DASH), cfg)
desc = next(t["function"]["description"] for t in SEEN[0][2]["tools"] if t["function"]["name"] == "open_view")
res = [json.loads(x) for x in tool_results(SEEN[1][2])]
check("open_view is offered with this page's views and the dashboard views",
      "diversity-plot" in desc and "treemap" in desc and "amr-table" in desc and "open_view" in SEEN[0][2]["messages"][0]["content"])
check("open_view: errors for unknown views, ambiguous and unknown samples",
      res[0]["ok"] and "not a dashboard view" in res[1]["error"] and len(res[2]["candidates"]) == 2
      and "No sample called" in res[3]["error"] and res[4]["ok"])
check("the views to open come back as actions, with the GUI's ids",
      r["actions"] == [{"type": "open", "page": "dashboard", "target": "treemap",
                        "sample": {"runId": "NorfolkSeq_24-07", "name": "Brancaster2_24-Jul"}},
                       {"type": "open", "page": "compare", "target": "ordination"}], r["actions"])

# ---- 5. CLI as the GUI runs it: context on stdin, key in the environment, JSON lines out
SCRIPT[:] = [{"tools": [("taxa_table", {"sample": BAMBI[1], "top_n": 3})]}, {"text": "Mostly Klebsiella."}]
SEEN.clear()
env = dict(os.environ, MARTI_LLM_API_KEY=KEY, PYTHONPATH=str(ROOT))
p = subprocess.run([sys.executable, "-m", "marti_llm.chat", "--provider", "anthropic", "--model", "claude-mock",
                    "--base-url", BASE], input=json.dumps(ctx()), capture_output=True, text=True, env=env,
                   cwd=str(ROOT))
lines = [json.loads(x) for x in p.stdout.splitlines() if x.strip()]
check("CLI: progress, tool and done events; answer in done",
      p.returncode == 0 and lines[-1]["event"] == "done" and lines[-1]["answer"] == "Mostly Klebsiella."
      and any(x["event"] == "tool" and x["name"] == "taxa_table" for x in lines), p.stdout + p.stderr)
check("CLI: the key is sent to the provider but never printed", SEEN[0][1].get("x-api-key") == KEY
      and KEY not in p.stdout and KEY not in p.stderr)
p = subprocess.run([sys.executable, "-m", "marti_llm.chat", "--provider", "anthropic", "--model", "m"],
                   input=json.dumps(ctx()), capture_output=True, text=True,
                   env={k: v for k, v in env.items() if k not in ("MARTI_LLM_API_KEY", "ANTHROPIC_API_KEY")},
                   cwd=str(ROOT))
last = json.loads(p.stdout.splitlines()[-1])
check("CLI: a missing key is an error event", p.returncode == 1 and last["event"] == "error"
      and "API key" in last["message"], p.stdout)

srv.shutdown()
print("\nALL CHAT CHECKS PASSED" if not failures else f"\n{failures} CHECK(S) FAILED")
sys.exit(1 if failures else 0)
