"""
Narrative generator tests against a mock LLM server (OpenAI-compatible and Anthropic formats).

    python tests/narrate_test.py /path/to/MARTi/gui/output
"""
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from marti_llm import narrate as N  # noqa: E402
from marti_llm.providers import LLMConfig, ProviderError  # noqa: E402

src = Path(sys.argv[1] if len(sys.argv) > 1 else "../MARTi/gui/output").resolve()
tmp = Path(tempfile.mkdtemp())
shutil.copytree(src / "BAMBI_P8_1D_19092017", tmp / "BAMBI_P8_1D_19092017")
SAMPLE = tmp / "BAMBI_P8_1D_19092017" / "marti" / "BAMBI_P8_1D_19092017"
KEY = "sk-test-SECRET-key-value-1234"
failures = 0


def check(label, ok, detail=""):
    global failures
    failures += not ok
    print(("PASS " if ok else "FAIL ") + label + (f"  [{detail}]" if detail and not ok else ""))


GOOD = {"summary": "Klebsiella pneumoniae dominates this sample with 16,774 reads (65.6% of classified reads), "
                   "followed by Proteus mirabilis (2,936 reads).",
        "sections": [
            {"title": "Overview", "text": "K. pneumoniae makes up 65.6% of classified reads; the run is complete "
                                          "with 25,705 reads analysed."},
            {"title": "Organisms of note", "text": "Listeria monocytogenes was detected at 42,000 reads. "
                                                   "Escherichia coli had 19 reads, which is presumptive."},
            {"title": "Antimicrobial resistance", "text": "SHV-187 was found in Klebsiella pneumoniae, and KPC-2 "
                                                          "was present."},
            {"title": "Data quality and limitations", "text": "Sequencing appears saturated."}]}
ANSWERS = []          # queue of raw answer texts for the mock to return
SEEN = []             # (path, headers, body) of requests the mock received


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

    def do_GET(self):
        SEEN.append((self.path, dict(self.headers), None))
        self._send({"data": [{"id": "mock-model"}, {"id": "other-model"}]})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["content-length"])))
        SEEN.append((self.path, dict(self.headers), body))
        text = ANSWERS.pop(0) if ANSWERS else json.dumps(GOOD)
        if self.path.endswith("/v1/messages"):
            self._send({"content": [{"type": "text", "text": text}],
                        "usage": {"input_tokens": 2000, "output_tokens": 300}})
        elif self.path.endswith("/chat/completions"):
            self._send({"choices": [{"message": {"role": "assistant", "content": text}}],
                        "usage": {"prompt_tokens": 2000, "completion_tokens": 300}})
        else:
            self._send({"error": {"message": "not found"}}, 404)


srv = HTTPServer(("127.0.0.1", 0), Mock)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{srv.server_port}"

# ---- 1. generate via OpenAI-compatible, answer wrapped in reasoning tags and a code fence
ANSWERS[:] = ["<think>planning...</think>\n```json\n" + json.dumps(GOOD) + "\n```"]
cfg = LLMConfig("openai-compatible", "mock-model", KEY, BASE + "/v1")
stages = []
doc = N.generate(SAMPLE, cfg, progress=lambda st, m: stages.append(st))["narrative"]
saved = json.loads((SAMPLE / "narrative.json").read_text())
check("narrative.json written and matches the returned document", saved == {"narrative": doc})
check("progress stages reported in order",
      stages == ["analysing", "calling_model", "checking", "writing"], stages)
check("summary and four sections parsed through <think> and ``` wrapping",
      doc["summary"].startswith("Klebsiella") and len(doc["sections"]) == 4)
check("basis records reads analysed and run status",
      doc["basis"]["readsAnalysed"] == 25705 and doc["basis"]["martiStatus"] == "Complete")
v = doc["validation"]
check("organism not in the sample is flagged (Listeria monocytogenes)",
      v["organisms_not_detected"] == ["Listeria monocytogenes"], v["organisms_not_detected"])
check("gene not in the sample is flagged (KPC-2), real gene is not (SHV-187)",
      v["genes_not_detected"] == ["KPC-2"], v["genes_not_detected"])
check("number not in the results is flagged (42,000); real ones are not (16,774, 65.6%, 2,936, 19)",
      v["numbers_not_found"] == ["42,000"], v["numbers_not_found"])
check("validation.ok is false when anything is flagged", v["ok"] is False)
req = [s for s in SEEN if s[2] is not None][-1]
check("API key sent as a Bearer header", req[1].get("authorization") == f"Bearer {KEY}")
check("API key appears nowhere in narrative.json", KEY not in (SAMPLE / "narrative.json").read_text())
check("prompt carries the analysis results, not raw files",
      "Klebsiella pneumoniae" in req[2]["messages"][1]["content"] and len(req[2]["messages"][1]["content"]) < 20000)
leftovers = [p.name for p in SAMPLE.iterdir() if p.name.startswith(".narrative.")]
check("no temporary files left behind", not leftovers, leftovers)

# ---- 2. clean narrative passes all checks
clean = {"summary": "Klebsiella pneumoniae accounts for 65.6% of classified reads (16,774 reads).",
         "sections": [{"title": "Overview", "text": "Proteus mirabilis follows with 2,936 reads. Listeria was not "
                                                    "detected in this screen."}]}
ANSWERS[:] = [json.dumps(clean)]
v = N.generate(SAMPLE, cfg)["narrative"]["validation"]
check("accurate narrative passes the numeric and gene checks", not v["numbers_not_found"] and not v["genes_not_detected"],
      v)
check("an organism named as absent is still listed, for the reader to confirm",
      v["organisms_not_detected"] == ["Listeria"], v["organisms_not_detected"])

# ---- 3. retry when the first answer is not JSON; Anthropic format
ANSWERS[:] = ["Here is my analysis: the sample is dominated by Klebsiella.", json.dumps(GOOD)]
n_before = len([s for s in SEEN if s[2] is not None])
acfg = LLMConfig("anthropic", "mock-model", KEY, BASE)
doc = N.generate(SAMPLE, acfg)["narrative"]
calls = [s for s in SEEN if s[2] is not None][n_before:]
check("retries once when the answer is not JSON, then succeeds", len(calls) == 2 and doc["summary"].startswith("Klebsiella"))
check("Anthropic request format (x-api-key header, /v1/messages, system prompt)",
      calls[0][0] == "/v1/messages" and calls[0][1].get("x-api-key") == KEY and "system" in calls[0][2])
check("token usage from both attempts is added up", doc["usage"] == {"input_tokens": 4000, "output_tokens": 600},
      doc["usage"])
ANSWERS[:] = ["not json", "still not json"]
try:
    N.generate(SAMPLE, cfg)
    check("gives up with a clear error after two unreadable answers", False)
except ProviderError as e:
    check("gives up with a clear error after two unreadable answers", "could not be read" in str(e), str(e))

# ---- 4. profiles from metadata keywords
md = SAMPLE / "metadata.json"
for kw, want in [("food factory, drain swab", "food_environment"), ("infant stool", "clinical"),
                 ("river water", "environmental"), ("misc", "general"), ("outdoor air, rooftop", "outdoor_air"),
                 ("bioaerosol", "outdoor_air"), ("indoor air", "general"), ("hair", "general"),
                 ("dairy", "food_environment"), ("airway", "clinical")]:
    md.write_text(json.dumps({"keywords": kw}))
    got = N.choose_profile(N.sample_from_dir(SAMPLE))
    check(f"keywords '{kw}' choose the {want} profile", got == want, got)
md.write_text(json.dumps({"keywords": "food factory, drain swab"}))
ANSWERS[:] = [json.dumps(GOOD)]
doc = N.generate(SAMPLE, cfg)["narrative"]
prompt = [s for s in SEEN if s[2] is not None][-1][2]["messages"][1]["content"]
check("food profile runs spoilage and hygiene screens and asks for its sections",
      set(doc["facts"]["screens"]) == {"human_pathogens", "food_spoilage", "hygiene_indicators"}
      and "Spoilage and hygiene indicators" in prompt)
md.write_text(json.dumps({"keywords": "outdoor air", "temperature": "18.5", "humidity": "62"}))
ANSWERS[:] = [json.dumps(GOOD)]
doc = N.generate(SAMPLE, cfg)["narrative"]
f = doc["facts"]
check("outdoor air profile: plant pathogen, allergen and contaminant screens, composition and weather",
      set(f["screens"]) == {"human_pathogens", "plant_pathogens", "airborne_allergens", "low_biomass_contaminants"}
      and f["composition"]["domains"][0]["name"] == "Bacteria"
      and f["sample"]["temperature"] == "18.5" and f["sample"]["humidity"] == "62")
prompt = [s for s in SEEN if s[2] is not None][-1][2]["messages"][1]["content"]
check("outdoor air prompt asks for its sections and carries the air guidance",
      "Allergens: fungal spores and pollen" in prompt and "low-biomass" in prompt)
md.unlink()
inp = N.narrative_inputs(N.sample_from_dir(SAMPLE))
check("without keywords, inputs say general was a fallback and list the other profiles",
      inp["profile"] == "general" and "no metadata keywords" in inp["profile_choice"]
      and "outdoor_air" in inp["other_profiles"], inp["profile_choice"])
inp = N.narrative_inputs(N.sample_from_dir(SAMPLE), "outdoor_air")
check("a requested profile is used and reported as requested",
      inp["profile"] == "outdoor_air" and "requested" in inp["profile_choice"]
      and "Plant pathogens" in inp["sections_to_write"])

# ---- lists: a wrong taxid must not report the wrong organism
from marti_llm import analysis as A  # noqa: E402
real_load = A.load_list
A.load_list = lambda list_id, store=None: {"id": "t", "title": "t", "description": "t", "entries": [
    {"taxid": 573, "name": "Listeria monocytogenes", "category": "x", "notes": ""},       # 573 is K. pneumoniae
    {"taxid": 573, "name": "Klebsiella pneumoniae subsp. old name", "category": "x", "notes": ""}]}
try:
    r = A.screen_samples([N.sample_from_dir(SAMPLE)], "t", with_read_identity=False)
finally:
    A.load_list = real_load
hits = r["results"][0]["hits"]
kp = [h for h in hits if h["taxon"] == "Klebsiella pneumoniae"]
check("a list taxid that belongs to another genus is ignored, with a warning; a same-genus rename is kept",
      len(kp) == 1 and any("not 'Listeria monocytogenes'" in w and "ignored" in w for w in r["list_validation_warnings"])
      and any("old name" in w and "ignored" not in w for w in r["list_validation_warnings"]),
      r["list_validation_warnings"])

# ---- 5. connection check, errors, read-only folder
r = N.check(LLMConfig("openai-compatible", "mock-model", "", BASE + "/v1"))
check("connection check finds the configured model", r["model_found"] and "is available" in r["message"])
r = N.check(LLMConfig("openai-compatible", "missing-model", "", BASE + "/v1"))
check("connection check reports a model that is not available", not r["model_found"] and "not in its list" in r["message"])
try:
    N.check(LLMConfig("openai-compatible", "m", "", "http://127.0.0.1:9/v1"))
    check("unreachable server gives a clear error", False)
except ProviderError as e:
    check("unreachable server gives a clear error", "Could not reach" in str(e), str(e))
try:
    LLMConfig("anthropic", "m", "")
    check("missing API key is refused before any request", False)
except ProviderError as e:
    check("missing API key is refused before any request", "No API key" in str(e))
if os.geteuid() != 0:
    SAMPLE.chmod(stat.S_IRUSR | stat.S_IXUSR)
    try:
        N.generate(SAMPLE, cfg)
        check("read-only sample folder gives a clear error", False)
    except PermissionError as e:
        check("read-only sample folder gives a clear error", "Cannot write" in str(e))
    finally:
        SAMPLE.chmod(stat.S_IRWXU)
else:
    print("SKIP read-only folder check (running as root)")

# ---- 6. the command line the GUI uses: key only in the environment, JSON progress lines
env = {**os.environ, "MARTI_LLM_API_KEY": KEY}
ANSWERS[:] = [json.dumps(GOOD)]
p = subprocess.run([sys.executable, "-m", "marti_llm.narrate", "--sample-dir", str(SAMPLE), "--json-progress",
                    "--provider", "openai-compatible", "--base-url", BASE + "/v1", "--model", "mock-model"],
                   cwd=ROOT, env=env, capture_output=True, text=True, timeout=120)
events = [json.loads(line) for line in p.stdout.splitlines() if line.strip()]
check("CLI prints one JSON event per line, ending in 'done'",
      p.returncode == 0 and events[-1]["event"] == "done" and all(e["event"] == "progress" for e in events[:-1]),
      p.stderr[-300:])
p = subprocess.run([sys.executable, "-m", "marti_llm.narrate", "--check", "--json-progress",
                    "--provider", "anthropic", "--model", "m"], cwd=ROOT, capture_output=True, text=True,
                   env={k: v for k, v in os.environ.items() if k not in ("MARTI_LLM_API_KEY", "ANTHROPIC_API_KEY")})
ev = json.loads(p.stdout.strip().splitlines()[-1])
check("CLI reports a missing key as an error event with exit code 1",
      p.returncode == 1 and ev["event"] == "error" and "No API key" in ev["message"])

srv.shutdown()
print("\nALL NARRATIVE CHECKS PASSED" if not failures else f"\n{failures} NARRATIVE CHECK(S) FAILED")
sys.exit(1 if failures else 0)
